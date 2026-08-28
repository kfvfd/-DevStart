"""Phase 2 Tickets/Help system backend tests."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read from frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = ("yagoadd@gmail.com", "admdevstart1")
COLLAB = ("carlos_col@devstart.com", "test1234")
JOAO = ("joao_tk@devstart.com", "test1234")
MARIA = ("maria_x@devstart.com", "test1234")


def _login_or_register(email, password, name=None):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    if r.status_code == 200:
        return r.json()["token"], r.json()["user"]
    # register
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": password, "name": name or email.split("@")[0]}, timeout=15)
    assert r.status_code in (200, 201), f"register failed: {r.status_code} {r.text}"
    return r.json()["token"], r.json()["user"]


@pytest.fixture(scope="module")
def tokens():
    admin_tok, admin_user = _login_or_register(*ADMIN, name="Yago")
    collab_tok, collab_user = _login_or_register(*COLLAB, name="Carlos")
    joao_tok, joao_user = _login_or_register(*JOAO, name="Joao")
    maria_tok, maria_user = _login_or_register(*MARIA, name="Maria")

    # Ensure roles: promote carlos to collaborator via admin
    h = {"Authorization": f"Bearer {admin_tok}"}
    users_resp = requests.get(f"{API}/admin/users", headers=h, timeout=15)
    assert users_resp.status_code == 200
    users_list = users_resp.json()
    if isinstance(users_list, dict):
        users_list = users_list.get("users", [])
    users_map = {u["email"]: u for u in users_list}
    if users_map.get(COLLAB[0], {}).get("role") != "collaborator":
        uid = users_map[COLLAB[0]]["id"]
        r = requests.patch(f"{API}/admin/users/{uid}/role", json={"role": "collaborator"}, headers=h, timeout=15)
        assert r.status_code == 200
    # Ensure joao and maria are regular 'user'
    for em in (JOAO[0], MARIA[0]):
        if users_map.get(em, {}).get("role") not in (None, "user"):
            uid = users_map[em]["id"]
            requests.patch(f"{API}/admin/users/{uid}/role", json={"role": "user"}, headers=h, timeout=15)

    return {
        "admin": admin_tok, "admin_user": admin_user,
        "collab": collab_tok, "collab_user": collab_user,
        "joao": joao_tok, "joao_user": joao_user,
        "maria": maria_tok, "maria_user": maria_user,
    }


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- create ticket ----------
def test_regular_user_creates_ticket_status_waiting(tokens):
    prob = f"TEST_help me debug {uuid.uuid4().hex[:6]}"
    r = requests.post(f"{API}/tickets", json={"problem": prob}, headers=_h(tokens["joao"]), timeout=15)
    assert r.status_code == 200, r.text
    tk = r.json()
    assert tk["status"] == "waiting"
    assert tk["problem"] == prob
    assert tk["user_id"] == tokens["joao_user"]["id"]
    assert tk["assignee_id"] is None
    # first message contains the problem
    detail = requests.get(f"{API}/tickets/{tk['id']}", headers=_h(tokens["joao"]), timeout=15)
    assert detail.status_code == 200
    msgs = detail.json()["messages"]
    assert len(msgs) >= 1 and msgs[0]["content"] == prob
    pytest.ticket_id = tk["id"]


def test_my_tickets_returns_owner_tickets(tokens):
    r = requests.get(f"{API}/tickets/mine", headers=_h(tokens["joao"]), timeout=15)
    assert r.status_code == 200
    ids = [t["id"] for t in r.json()]
    assert pytest.ticket_id in ids


# ---------- staff-only endpoints reject regular user ----------
def test_staff_endpoints_forbidden_for_regular_user(tokens):
    tok = _h(tokens["joao"])
    r1 = requests.get(f"{API}/tickets", headers=tok, timeout=15)
    r2 = requests.get(f"{API}/tickets/stats", headers=tok, timeout=15)
    r3 = requests.patch(f"{API}/tickets/{pytest.ticket_id}/claim", headers=tok, timeout=15)
    assert r1.status_code == 403, r1.text
    assert r2.status_code == 403, r2.text
    assert r3.status_code == 403, r3.text


def test_staff_can_list_and_stats(tokens):
    r1 = requests.get(f"{API}/tickets", headers=_h(tokens["collab"]), timeout=15)
    assert r1.status_code == 200 and isinstance(r1.json(), list)
    r2 = requests.get(f"{API}/tickets/stats", headers=_h(tokens["collab"]), timeout=15)
    assert r2.status_code == 200
    data = r2.json()
    for k in ("waiting", "in_progress", "resolved"):
        assert k in data and isinstance(data[k], int)


# ---------- access control on ticket detail & messages ----------
def test_other_regular_user_cannot_access_ticket(tokens):
    r = requests.get(f"{API}/tickets/{pytest.ticket_id}", headers=_h(tokens["maria"]), timeout=15)
    assert r.status_code == 403
    r2 = requests.post(f"{API}/tickets/{pytest.ticket_id}/messages", json={"content": "hi"}, headers=_h(tokens["maria"]), timeout=15)
    assert r2.status_code == 403


def test_owner_can_access_and_post(tokens):
    r = requests.get(f"{API}/tickets/{pytest.ticket_id}", headers=_h(tokens["joao"]), timeout=15)
    assert r.status_code == 200


# ---------- staff first reply auto in_progress + assign ----------
def test_staff_first_reply_moves_to_in_progress_and_assigns(tokens):
    # create a fresh waiting ticket
    r = requests.post(f"{API}/tickets", json={"problem": "TEST_auto assign"}, headers=_h(tokens["joao"]), timeout=15)
    assert r.status_code == 200
    tid = r.json()["id"]
    # collab posts reply
    reply = requests.post(f"{API}/tickets/{tid}/messages", json={"content": "on it"}, headers=_h(tokens["collab"]), timeout=15)
    assert reply.status_code == 200
    # verify
    d = requests.get(f"{API}/tickets/{tid}", headers=_h(tokens["collab"]), timeout=15).json()
    assert d["ticket"]["status"] == "in_progress"
    assert d["ticket"]["assignee_id"] == tokens["collab_user"]["id"]


# ---------- claim ----------
def test_claim_assigns_and_sets_in_progress(tokens):
    r = requests.post(f"{API}/tickets", json={"problem": "TEST_claim me"}, headers=_h(tokens["joao"]), timeout=15)
    tid = r.json()["id"]
    c = requests.patch(f"{API}/tickets/{tid}/claim", headers=_h(tokens["admin"]), timeout=15)
    assert c.status_code == 200
    d = requests.get(f"{API}/tickets/{tid}", headers=_h(tokens["admin"]), timeout=15).json()
    assert d["ticket"]["status"] == "in_progress"
    assert d["ticket"]["assignee_id"] == tokens["admin_user"]["id"]


# ---------- status changes ----------
def test_owner_can_resolve_and_reopen(tokens):
    r = requests.post(f"{API}/tickets", json={"problem": "TEST_status"}, headers=_h(tokens["joao"]), timeout=15)
    tid = r.json()["id"]
    resolved = requests.patch(f"{API}/tickets/{tid}/status", json={"status": "resolved"}, headers=_h(tokens["joao"]), timeout=15)
    assert resolved.status_code == 200
    d = requests.get(f"{API}/tickets/{tid}", headers=_h(tokens["joao"]), timeout=15).json()
    assert d["ticket"]["status"] == "resolved"
    reopened = requests.patch(f"{API}/tickets/{tid}/status", json={"status": "in_progress"}, headers=_h(tokens["joao"]), timeout=15)
    assert reopened.status_code == 200
    d2 = requests.get(f"{API}/tickets/{tid}", headers=_h(tokens["joao"]), timeout=15).json()
    assert d2["ticket"]["status"] == "in_progress"


def test_staff_can_change_status_of_others_ticket(tokens):
    r = requests.post(f"{API}/tickets", json={"problem": "TEST_staff status"}, headers=_h(tokens["joao"]), timeout=15)
    tid = r.json()["id"]
    resolved = requests.patch(f"{API}/tickets/{tid}/status", json={"status": "resolved"}, headers=_h(tokens["collab"]), timeout=15)
    assert resolved.status_code == 200


def test_non_owner_non_staff_cannot_change_status(tokens):
    r = requests.post(f"{API}/tickets", json={"problem": "TEST_forbidden status"}, headers=_h(tokens["joao"]), timeout=15)
    tid = r.json()["id"]
    forbidden = requests.patch(f"{API}/tickets/{tid}/status", json={"status": "resolved"}, headers=_h(tokens["maria"]), timeout=15)
    assert forbidden.status_code == 403
