def test_user_registration(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "password123",
            "first_name": "Test",
            "last_name": "User",
        },
    )

    assert response.status_code == 201
    data = response.get_json()
    assert data["message"] == "User registered successfully"
    assert data["user"]["email"] == "test@example.com"
    assert data["user"]["role"] == "customer"
    assert "password_hash" not in data["user"]


def test_duplicate_registration(client):
    payload = {
        "email": "duplicate@example.com",
        "password": "password123",
        "first_name": "Test",
        "last_name": "User",
    }

    assert client.post("/api/v1/auth/register", json=payload).status_code == 201
    assert client.post("/api/v1/auth/register", json=payload).status_code == 409


def test_login_returns_frontend_user_shape(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "login@example.com",
            "password": "password123",
            "first_name": "Login",
            "last_name": "User",
        },
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "login@example.com", "password": "password123"},
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["access_token"]
    assert data["user"]["email"] == "login@example.com"
