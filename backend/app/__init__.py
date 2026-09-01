from flask import Flask
from dotenv import load_dotenv

from app.config import Config
from app.extensions import db, jwt, migrate

# Import models so SQLAlchemy knows about them.
from app.models import (
    User,
    Policy,
    Claim,
    Assessment,
    AuditLog,
)

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

    # Initialize extensions.
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Register routes.
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(policies_bp)
    app.register_blueprint(claims_bp)
    app.register_blueprint(assessments_bp)

    return app