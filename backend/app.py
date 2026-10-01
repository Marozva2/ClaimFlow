from config import Config
from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
import redis
from models import db
from routes.assessments import assessment_bp
from routes.admin import admin_bp
from routes.auth import auth_bp, bcrypt, jwt
from routes.claims import claims_bp
from routes.health import health_bp
from routes.policies import policies_bp

migrate = Migrate()


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(Config)
    if config_object is not Config:
        app.config.from_object(config_object)
    app.extensions["jwt_redis_blocklist"] = redis.Redis(
        host=app.config["REDIS_HOST"],
        port=app.config["REDIS_PORT"],
        db=app.config["REDIS_DB"],
        decode_responses=True,
    )

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(admin_bp, url_prefix="/api/v1")
    app.register_blueprint(health_bp, url_prefix="/api/v1")
    app.register_blueprint(assessment_bp, url_prefix="/api/v1")
    app.register_blueprint(policies_bp, url_prefix="/api/v1")
    app.register_blueprint(claims_bp, url_prefix="/api/v1")

    CORS(
        app,
        resources={
            r"/*": {
                "origins": [app.config["FRONTEND_URL"]],
            }
        },
    )

    return app


app = create_app()

if __name__ == "__main__":
    app.run(
        debug=app.config["DEBUG"],
    )
