from urllib.parse import quote
from fastapi.testclient import TestClient
from src.app import app, activities

client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    # Expect the sample activity "Chess Club" to exist
    assert "Chess Club" in data


def test_signup_and_reflect():
    activity = "Chess Club"
    email = "test_user_for_signup@example.com"
    # Ensure email not present initially
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # Signup
    signup_path = f"/activities/{quote(activity)}/signup?email={quote(email)}"
    resp = client.post(signup_path)
    assert resp.status_code == 200
    body = resp.json()
    assert "Signed up" in body.get("message", "")

    # Verify via GET that participant appears
    get_resp = client.get("/activities")
    assert get_resp.status_code == 200
    data = get_resp.json()
    participants = data[activity]["participants"]
    assert email in participants

    # Cleanup: unregister
    delete_path = f"/activities/{quote(activity)}/participants?email={quote(email)}"
    del_resp = client.delete(delete_path)
    assert del_resp.status_code == 200


def test_unregister_nonexistent():
    activity = "Chess Club"
    fake_email = "i_do_not_exist@example.com"
    # Ensure not present
    if fake_email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(fake_email)

    delete_path = f"/activities/{quote(activity)}/participants?email={quote(fake_email)}"
    resp = client.delete(delete_path)
    assert resp.status_code == 404
