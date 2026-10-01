import pytest
from models import db

from backend.app import create_app


class TestConfig:
    TESTING = True

    SECRET_KEY = "test-secret-key-for-claimflow-tests"
    JWT_SECRET_KEY = "test-jwt-secret-key-for-claimflow-tests"

    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_BLOCKLIST_ENABLED = False


@pytest.fixture
def app():
    app = create_app(TestConfig)

    with app.app_context():
        db.create_all()

        yield app

        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()
