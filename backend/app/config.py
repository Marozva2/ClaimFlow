import os


class Config:
    """Base application configuration."""

    SECRET_KEY = os.getenv("SECRET_KEY", "development-secret-key")

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://claimflow:claimflow@localhost:5432/claimflow",
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.getenv(
        "JWT_SECRET_KEY",
        "development-jwt-secret-key",
    )