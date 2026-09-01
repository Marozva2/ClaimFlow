def test_user_registration(client):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "test@example.com",
            "password": "password123",
            "first_name": "Test",
            "last_name": "User",
        },
    )

    assert response.status_code == 201

    data = response.get_json()

    assert data["message"] == (
        "User registered successfully"
    )

    assert data["user"]["email"] == (
        "test@example.com"
    )


def test_duplicate_registration(client):
    payload = {
        "email": "duplicate@example.com",
        "password": "password123",
        "first_name": "Test",
        "last_name": "User",
    }

    first_response = client.post(
        "/api/auth/register",
        json=payload,
    )

    assert first_response.status_code == 201

    second_response = client.post(
        "/api/auth/register",
        json=payload,
    )

    assert second_response.status_code == 409


def test_login(client):
    client.post(
        "/api/auth/register",
        json={
            "email": "login@example.com",
            "password": "password123",
            "first_name": "Login",
            "last_name": "User",
        },
    )

    response = client.post(
        "/api/auth/login",
        json={
            "email": "login@example.com",
            "password": "password123",
        },
    )

    assert response.status_code == 200

    data = response.get_json()

    assert "access_token" in data
    assert data["user"]["email"] == (
        "login@example.com"
    )