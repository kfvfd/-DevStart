"""Backend RBAC tests for DevStart Admin Panel."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://coding-starter-kit-4.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "yagoadd@gmail.com"
ADMIN_PASSWORD = "admdevstart1"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "admin"
    return data["token"]


@pytest.fixture(scope="session")
def user_creds():
    email = f"TEST_user_{uuid.uuid4().hex[:8]}@example.com"
    password = "userpass123"
    r = requests.post(f"{API}/auth/register", json={"name": "TEST User", "email": email, "password": password})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["role"] == "user"
    return {"email": email, "password": password, "token": data["token"], "id": data["user"]["id"]}


@pytest.fixture(scope="session")
def user_token(user_creds):
    return user_creds["token"]


def h(token):
    return {"Authorization": f"Bearer {token}"}


# --- Auth basics ---
class TestAuth:
    def test_admin_login_returns_admin_role(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=h(admin_token))
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_new_user_defaults_to_user_role(self, user_creds):
        assert user_creds["token"]
        r = requests.get(f"{API}/auth/me", headers=h(user_creds["token"]))
        assert r.status_code == 200
        assert r.json()["role"] == "user"


# --- Admin endpoints accessible to admin ---
class TestAdminAccess:
    def test_admin_list_users(self, admin_token):
        r = requests.get(f"{API}/admin/users", headers=h(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert "users" in d and "counts" in d and "roles" in d
        assert any(u["email"] == ADMIN_EMAIL for u in d["users"])

    def test_admin_stats(self, admin_token):
        r = requests.get(f"{API}/admin/stats", headers=h(admin_token))
        assert r.status_code == 200
        d = r.json()
        for k in ["total_users", "total_projects", "total_templates", "users_by_role"]:
            assert k in d

    def test_admin_template_crud(self, admin_token):
        payload = {"name": "TEST_Template", "description": "d", "level": "Iniciante",
                   "language": "JS", "framework": "HTML", "goal": "g"}
        r = requests.post(f"{API}/admin/templates", json=payload, headers=h(admin_token))
        assert r.status_code == 200
        tid = r.json()["id"]

        r2 = requests.patch(f"{API}/admin/templates/{tid}",
                            json={**payload, "name": "TEST_Template_Updated"}, headers=h(admin_token))
        assert r2.status_code == 200
        assert r2.json()["name"] == "TEST_Template_Updated"

        r3 = requests.delete(f"{API}/admin/templates/{tid}", headers=h(admin_token))
        assert r3.status_code == 200


# --- Security: regular user forbidden ---
class TestAdminSecurity:
    @pytest.mark.parametrize("method,path", [
        ("GET", "/admin/users"),
        ("GET", "/admin/stats"),
        ("POST", "/admin/templates"),
    ])
    def test_user_403(self, user_token, method, path):
        fn = getattr(requests, method.lower())
        kwargs = {"headers": h(user_token)}
        if method == "POST":
            kwargs["json"] = {"name": "x", "description": "d", "level": "Iniciante",
                              "language": "JS", "framework": "HTML", "goal": "g"}
        r = fn(f"{API}{path}", **kwargs)
        assert r.status_code == 403, f"{path} returned {r.status_code}"

    def test_user_cannot_change_role(self, user_creds, user_token):
        r = requests.patch(f"{API}/admin/users/{user_creds['id']}/role",
                           json={"role": "admin"}, headers=h(user_token))
        assert r.status_code == 403

    def test_user_cannot_delete(self, user_creds, user_token):
        r = requests.delete(f"{API}/admin/users/{user_creds['id']}", headers=h(user_token))
        assert r.status_code == 403

    def test_no_token_rejected(self):
        # HTTPBearer rejects with 401/403 when no header
        r = requests.get(f"{API}/admin/users")
        assert r.status_code in (401, 403)

    def test_invalid_token_rejected(self):
        r = requests.get(f"{API}/admin/users", headers={"Authorization": "Bearer bad.token.here"})
        assert r.status_code == 401

    def test_no_self_escalation_route_exists(self, user_token):
        # Try common self-escalation shapes; all should fail
        for path in ["/auth/role", "/users/me/role", "/auth/me"]:
            r = requests.patch(f"{API}{path}", json={"role": "admin"}, headers=h(user_token))
            assert r.status_code in (401, 403, 404, 405), f"{path} unexpectedly {r.status_code}"
        # After all attempts confirm role unchanged
        me = requests.get(f"{API}/auth/me", headers=h(user_token)).json()
        assert me["role"] == "user"


# --- Admin guards on owner + last admin ---
class TestAdminGuards:
    def test_owner_cannot_be_demoted(self, admin_token):
        owner = next(u for u in requests.get(f"{API}/admin/users", headers=h(admin_token)).json()["users"]
                     if u["email"] == ADMIN_EMAIL)
        r = requests.patch(f"{API}/admin/users/{owner['id']}/role",
                           json={"role": "user"}, headers=h(admin_token))
        assert r.status_code == 400

    def test_owner_cannot_be_deleted(self, admin_token):
        owner = next(u for u in requests.get(f"{API}/admin/users", headers=h(admin_token)).json()["users"]
                     if u["email"] == ADMIN_EMAIL)
        r = requests.delete(f"{API}/admin/users/{owner['id']}", headers=h(admin_token))
        assert r.status_code == 400


# --- Admin can change another user's role and it persists ---
class TestRoleChange:
    def test_change_and_persist(self, admin_token):
        email = f"TEST_role_{uuid.uuid4().hex[:8]}@example.com"
        reg = requests.post(f"{API}/auth/register", json={"name": "R", "email": email, "password": "pw123456"})
        assert reg.status_code == 200
        uid = reg.json()["user"]["id"]
        try:
            r = requests.patch(f"{API}/admin/users/{uid}/role",
                               json={"role": "moderator"}, headers=h(admin_token))
            assert r.status_code == 200
            listing = requests.get(f"{API}/admin/users", headers=h(admin_token)).json()
            target = next(u for u in listing["users"] if u["id"] == uid)
            assert target["role"] == "moderator"
        finally:
            requests.delete(f"{API}/admin/users/{uid}", headers=h(admin_token))
