from fastapi.testclient import TestClient
from src.app import app, activities

client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    # should return a dict containing known activity
    assert "Chess Club" in data


def test_signup_and_unregister_cycle():
    activity = "Chess Club"
    test_email = "test_student@mergington.edu"

    # Ensure not already in participants
    if test_email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(test_email)

    # Signup
    resp = client.post(f"/activities/{activity}/signup?email={test_email}")
    assert resp.status_code == 200
    assert test_email in activities[activity]["participants"]
    body = resp.json()
    assert "Signed up" in body.get("message", "")

    # Duplicate signup should fail
    resp2 = client.post(f"/activities/{activity}/signup?email={test_email}")
    assert resp2.status_code == 400

    # Unregister
    resp3 = client.delete(f"/activities/{activity}/participants?email={test_email}")
    assert resp3.status_code == 200
    assert test_email not in activities[activity]["participants"]
    body3 = resp3.json()
    assert "Unregistered" in body3.get("message", "")


def test_unregister_nonexistent():
    activity = "Programming Class"
    non_email = "no_such_user@mergington.edu"

    # Ensure non-existent
    if non_email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(non_email)

    resp = client.delete(f"/activities/{activity}/participants?email={non_email}")
    assert resp.status_code == 404
