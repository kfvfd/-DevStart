"""Phase 3 (AI improvement loop) + Notifications backend tests."""
import os
import uuid
import time
import json
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
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
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": password, "name": name or email.split("@")[0]}, timeout=15)
    assert r.status_code in (200, 201), f"register failed: {r.status_code} {r.text}"
    return r.json()["token"], r.json()["user"]


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def tokens():
    admin_tok, admin_user = _login_or_register(*ADMIN, name="Yago")
    collab_tok, collab_user = _login_or_register(*COLLAB, name="Carlos")
    joao_tok, joao_user = _login_or_register(*JOAO, name="Joao")
    maria_tok, maria_user = _login_or_register(*MARIA, name="Maria")
    h = _h(admin_tok)
    resp = requests.get(f"{API}/admin/users", headers=h, timeout=15).json()
    ulist = resp["users"] if isinstance(resp, dict) else resp
    umap = {u["email"]: u for u in ulist}
    if umap[COLLAB[0]].get("role") != "collaborator":
        requests.patch(f"{API}/admin/users/{umap[COLLAB[0]]['id']}/role", json={"role": "collaborator"}, headers=h, timeout=15)
    for em in (JOAO[0], MARIA[0]):
        if umap[em].get("role") not in (None, "user"):
            requests.patch(f"{API}/admin/users/{umap[em]['id']}/role", json={"role": "user"}, headers=h, timeout=15)
    return {"admin": admin_tok, "admin_user": admin_user, "collab": collab_tok, "collab_user": collab_user,
            "joao": joao_tok, "joao_user": joao_user, "maria": maria_tok, "maria_user": maria_user}


def _create_ticket(joao_tok, problem=None):
    p = problem or f"TEST_p3 {uuid.uuid4().hex[:6]}"
    r = requests.post(f"{API}/tickets", json={"problem": p}, headers=_h(joao_tok), timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _resolve(tok, tid):
    r = requests.patch(f"{API}/tickets/{tid}/status", json={"status": "resolved"}, headers=_h(tok), timeout=15)
    assert r.status_code == 200


# ============== NOTIFICATIONS ==============

def test_notify_owner_when_staff_replies(tokens):
    # Baseline unread count for joao
    before = requests.get(f"{API}/notifications/unread_count", headers=_h(tokens["joao"]), timeout=15).json()["count"]
    tid = _create_ticket(tokens["joao"])
    # collab replies -> should notify joao
    r = requests.post(f"{API}/tickets/{tid}/messages", json={"content": "TEST_staff reply"}, headers=_h(tokens["collab"]), timeout=15)
    assert r.status_code == 200
    time.sleep(0.4)
    after = requests.get(f"{API}/notifications/unread_count", headers=_h(tokens["joao"]), timeout=15).json()["count"]
    assert after >= before + 1, f"expected count to increase; before={before} after={after}"
    lst = requests.get(f"{API}/notifications", headers=_h(tokens["joao"]), timeout=15).json()
    assert any(n["ticket_id"] == tid for n in lst)
    pytest.p3_tid = tid


def test_notify_assignee_when_owner_replies(tokens):
    tid = pytest.p3_tid
    before = requests.get(f"{API}/notifications/unread_count", headers=_h(tokens["collab"]), timeout=15).json()["count"]
    r = requests.post(f"{API}/tickets/{tid}/messages", json={"content": "TEST_owner reply"}, headers=_h(tokens["joao"]), timeout=15)
    assert r.status_code == 200
    time.sleep(0.4)
    after = requests.get(f"{API}/notifications/unread_count", headers=_h(tokens["collab"]), timeout=15).json()["count"]
    assert after >= before + 1


def test_user_not_notified_of_own_message(tokens):
    tid = _create_ticket(tokens["joao"])
    before = requests.get(f"{API}/notifications/unread_count", headers=_h(tokens["joao"]), timeout=15).json()["count"]
    # joao posts own message on his own ticket (not assigned) -> nobody else to notify, joao shouldn't get one
    r = requests.post(f"{API}/tickets/{tid}/messages", json={"content": "TEST_self"}, headers=_h(tokens["joao"]), timeout=15)
    assert r.status_code == 200
    time.sleep(0.4)
    after = requests.get(f"{API}/notifications/unread_count", headers=_h(tokens["joao"]), timeout=15).json()["count"]
    assert after == before, f"user should not be notified of own message; before={before} after={after}"


def test_mark_specific_notifications_read(tokens):
    lst = requests.get(f"{API}/notifications", headers=_h(tokens["joao"]), timeout=15).json()
    unread = [n["id"] for n in lst if not n.get("read")]
    if not unread:
        pytest.skip("no unread notifications to mark")
    target = unread[:1]
    before = requests.get(f"{API}/notifications/unread_count", headers=_h(tokens["joao"]), timeout=15).json()["count"]
    r = requests.post(f"{API}/notifications/read", json={"ids": target}, headers=_h(tokens["joao"]), timeout=15)
    assert r.status_code == 200
    after = requests.get(f"{API}/notifications/unread_count", headers=_h(tokens["joao"]), timeout=15).json()["count"]
    assert after == before - 1


def test_mark_all_notifications_read(tokens):
    r = requests.post(f"{API}/notifications/read", json={}, headers=_h(tokens["joao"]), timeout=15)
    assert r.status_code == 200
    c = requests.get(f"{API}/notifications/unread_count", headers=_h(tokens["joao"]), timeout=15).json()["count"]
    assert c == 0


# ============== PHASE 3 RATING ==============

def test_rate_only_on_resolved(tokens):
    tid = _create_ticket(tokens["joao"])
    # not resolved yet
    r = requests.patch(f"{API}/tickets/{tid}/rate", json={"rating": "up"}, headers=_h(tokens["joao"]), timeout=15)
    assert r.status_code == 400


def test_rate_non_owner_forbidden(tokens):
    tid = _create_ticket(tokens["joao"])
    _resolve(tokens["joao"], tid)
    # staff who is not owner
    r = requests.patch(f"{API}/tickets/{tid}/rate", json={"rating": "up"}, headers=_h(tokens["collab"]), timeout=15)
    assert r.status_code == 403
    # another regular user
    r2 = requests.patch(f"{API}/tickets/{tid}/rate", json={"rating": "up"}, headers=_h(tokens["maria"]), timeout=15)
    assert r2.status_code in (403, 404)


def test_rate_owner_ok_and_persists(tokens):
    tid = _create_ticket(tokens["joao"])
    _resolve(tokens["joao"], tid)
    r = requests.patch(f"{API}/tickets/{tid}/rate", json={"rating": "up"}, headers=_h(tokens["joao"]), timeout=15)
    assert r.status_code == 200
    d = requests.get(f"{API}/tickets/{tid}", headers=_h(tokens["joao"]), timeout=15).json()
    assert d["ticket"]["rating"] == "up"


# ============== PHASE 3 GOOD EXAMPLE ==============

def test_good_example_regular_user_forbidden(tokens):
    tid = _create_ticket(tokens["joao"])
    # collab reply so there's staff content
    requests.post(f"{API}/tickets/{tid}/messages", json={"content": "TEST_solution here"}, headers=_h(tokens["collab"]), timeout=15)
    _resolve(tokens["joao"], tid)
    r = requests.post(f"{API}/tickets/{tid}/good-example", headers=_h(tokens["joao"]), timeout=15)
    assert r.status_code == 403


def test_good_example_staff_creates_pending_and_idempotent(tokens):
    tid = _create_ticket(tokens["joao"])
    requests.post(f"{API}/tickets/{tid}/messages", json={"content": "TEST_use useState to fix"}, headers=_h(tokens["collab"]), timeout=15)
    _resolve(tokens["joao"], tid)
    r = requests.post(f"{API}/tickets/{tid}/good-example", headers=_h(tokens["collab"]), timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "pending"
    assert body["ticket_id"] == tid
    # ticket.good_example should be true
    d = requests.get(f"{API}/tickets/{tid}", headers=_h(tokens["collab"]), timeout=15).json()
    assert d["ticket"]["good_example"] is True
    # idempotency
    r2 = requests.post(f"{API}/tickets/{tid}/good-example", headers=_h(tokens["collab"]), timeout=15)
    assert r2.status_code == 200
    assert r2.json()["id"] == body["id"]
    pytest.p3_kid = body["id"]
    pytest.p3_good_tid = tid


# ============== ADMIN KNOWLEDGE ==============

def test_admin_knowledge_forbidden_for_non_admin(tokens):
    for role_tok in ("collab", "joao"):
        r = requests.get(f"{API}/admin/knowledge", headers=_h(tokens[role_tok]), timeout=15)
        assert r.status_code == 403


def test_admin_knowledge_list_has_counts_and_pending_entry(tokens):
    r = requests.get(f"{API}/admin/knowledge", headers=_h(tokens["admin"]), timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert "items" in body and "counts" in body
    assert "pending" in body["counts"] and "approved" in body["counts"]
    ids = [i["id"] for i in body["items"]]
    assert pytest.p3_kid in ids


def test_admin_approve_knowledge(tokens):
    r = requests.patch(f"{API}/admin/knowledge/{pytest.p3_kid}/approve", headers=_h(tokens["admin"]), timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "approved"
    # ticket.approved is now true
    d = requests.get(f"{API}/tickets/{pytest.p3_good_tid}", headers=_h(tokens["admin"]), timeout=15).json()
    assert d["ticket"]["approved"] is True
    # listing should reflect approved status
    lst = requests.get(f"{API}/admin/knowledge?status=approved", headers=_h(tokens["admin"]), timeout=15).json()
    assert any(i["id"] == pytest.p3_kid and i["status"] == "approved" for i in lst["items"])


def test_admin_approve_forbidden_non_admin(tokens):
    r = requests.patch(f"{API}/admin/knowledge/{pytest.p3_kid}/approve", headers=_h(tokens["collab"]), timeout=15)
    assert r.status_code == 403


def test_admin_delete_knowledge(tokens):
    # create a fresh knowledge to delete
    tid = _create_ticket(tokens["joao"])
    requests.post(f"{API}/tickets/{tid}/messages", json={"content": "TEST_disposable solution"}, headers=_h(tokens["collab"]), timeout=15)
    _resolve(tokens["joao"], tid)
    kid = requests.post(f"{API}/tickets/{tid}/good-example", headers=_h(tokens["collab"]), timeout=15).json()["id"]
    # non-admin cannot delete
    rf = requests.delete(f"{API}/admin/knowledge/{kid}", headers=_h(tokens["collab"]), timeout=15)
    assert rf.status_code == 403
    # admin deletes
    r = requests.delete(f"{API}/admin/knowledge/{kid}", headers=_h(tokens["admin"]), timeout=15)
    assert r.status_code == 200
    # ensure gone
    lst = requests.get(f"{API}/admin/knowledge", headers=_h(tokens["admin"]), timeout=15).json()
    assert not any(i["id"] == kid for i in lst["items"])
    # ticket.good_example reset
    d = requests.get(f"{API}/tickets/{tid}", headers=_h(tokens["admin"]), timeout=15).json()
    assert d["ticket"]["good_example"] is False


# ============== CHAT STREAM STILL WORKS AFTER KNOWLEDGE ==============

def test_chat_stream_still_works_after_approved_knowledge(tokens):
    r = requests.post(
        f"{API}/chat/stream",
        json={"message": "Oi, teste rapido", "mode": "general", "model": "claude", "language_ui": "pt"},
        headers=_h(tokens["joao"]),
        timeout=60,
        stream=True,
    )
    assert r.status_code == 200
    got_delta = False
    got_done = False
    # read up to a few SSE events
    for i, raw in enumerate(r.iter_lines()):
        if not raw:
            continue
        line = raw.decode("utf-8", "ignore")
        if line.startswith("data:"):
            try:
                payload = json.loads(line[5:].strip())
            except Exception:
                continue
            if "delta" in payload:
                got_delta = True
            if payload.get("done"):
                got_done = True
                break
        if i > 400:
            break
    r.close()
    assert got_delta or got_done, "no SSE events received"
