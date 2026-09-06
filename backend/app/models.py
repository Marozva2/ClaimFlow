from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()


# ==============================================================================
# MODELS
# ==============================================================================

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(50), nullable=False, default="customer")
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    policies = db.relationship(
        "Policy", back_populates="user", cascade="all, delete-orphan"
    )
    assessments = db.relationship("Assessment", back_populates="assessor")
    audit_logs = db.relationship("AuditLog", back_populates="user")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User {self.email}>"


class Policy(db.Model):
    __tablename__ = "policies"

    id = db.Column(db.Integer, primary_key=True)
    policy_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    policy_type = db.Column(db.String(100), nullable=False)
    premium = db.Column(db.Numeric(12, 2), nullable=False)
    coverage_amount = db.Column(db.Numeric(12, 2), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(50), nullable=False, default="active")
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = db.relationship("User", back_populates="policies")
    claims = db.relationship(
        "Claim", back_populates="policy", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Policy {self.policy_number}>"


class Claim(db.Model):
    __tablename__ = "claims"

    id = db.Column(db.Integer, primary_key=True)
    claim_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    policy_id = db.Column(db.Integer, db.ForeignKey("policies.id"), nullable=False)
    description = db.Column(db.Text, nullable=False)
    amount_claimed = db.Column(db.Numeric(12, 2), nullable=False)
    amount_approved = db.Column(db.Numeric(12, 2), nullable=True)
    status = db.Column(db.String(50), nullable=False, default="submitted")
    submitted_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    policy = db.relationship("Policy", back_populates="claims")
    assessments = db.relationship(
        "Assessment", back_populates="claim", cascade="all, delete-orphan"
    )
    audit_logs = db.relationship(
        "AuditLog", back_populates="claim", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Claim {self.claim_number}>"


class Assessment(db.Model):
    __tablename__ = "assessments"

    id = db.Column(db.Integer, primary_key=True)
    claim_id = db.Column(db.Integer, db.ForeignKey("claims.id"), nullable=False)
    assessor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    recommendation = db.Column(db.String(50), nullable=False)
    approved_amount = db.Column(db.Numeric(12, 2), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    assessed_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    claim = db.relationship("Claim", back_populates="assessments")
    assessor = db.relationship("User", back_populates="assessments")

    def __repr__(self):
        return f"<Assessment id={self.id} claim_id={self.claim_id}>"


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    claim_id = db.Column(db.Integer, db.ForeignKey("claims.id"), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = db.relationship("User", back_populates="audit_logs")
    claim = db.relationship("Claim", back_populates="audit_logs")

    def __repr__(self):
        return f"<AuditLog id={self.id} action='{self.action}'>"