from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from app.config import Config
from app.extensions import db, jwt, migrate

from app.models import (
    User,
    Policy,
    Claim,
    Assessment,
    AuditLog,
)

from app.routes.api import api_bp
from app.routes.assessments import assessments_bp
from app.routes.auth import auth_bp
from app.routes.claims import claims_bp
from app.routes.health import health_bp
from app.routes.policies import policies_bp


load_dotenv()


def create_app(config_class=Config):
    """Create and configure the Flask application."""

    app = Flask(__name__)

    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                ]
            }
        },
    )

    app.register_blueprint(health_bp)
    app.register_blueprint(api_bp, url_prefix="/api")
    app.register_blueprint(auth_bp)
    app.register_blueprint(policies_bp)
    app.register_blueprint(claims_bp)
    app.register_blueprint(assessments_bp)

    return app