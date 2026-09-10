from config import Config
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from models import db
from routes.assessments import assessment_bp
from routes.auth import auth_bp, bcrypt, jwt
from routes.claims import claims_bp
from routes.health import health_bp
from routes.policies import policies_bp

migrate = Migrate()


def create_app():
    load_dotenv()

    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(assessment_bp)
    app.register_blueprint(policies_bp)
    app.register_blueprint(claims_bp)

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
