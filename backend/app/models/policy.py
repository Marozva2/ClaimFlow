from datetime import datetime, timezone

from app.extensions import db


class Policy(db.Model):
    __tablename__ = "policies"

    id = db.Column(db.Integer, primary_key=True)

    policy_number = db.Column(
        db.String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
    )

    policy_type = db.Column(
        db.String(100),
        nullable=False,
    )

    premium = db.Column(
        db.Numeric(12, 2),
        nullable=False,
    )

    coverage_amount = db.Column(
        db.Numeric(12, 2),
        nullable=False,
    )

    start_date = db.Column(
        db.Date,
        nullable=False,
    )

    end_date = db.Column(
        db.Date,
        nullable=False,
    )

    status = db.Column(
        db.String(50),
        nullable=False,
        default="active",
    )

    user = db.relationship(
        "User",
        back_populates="policies",
    )

    claims = db.relationship(
        "Claim",
        back_populates="policy",
        cascade="all, delete-orphan",
    )

    created_at = db.Column(
    db.DateTime(timezone=True),
    nullable=False,
    default=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "policy_number": self.policy_number,
            "user_id": self.user_id,
            "policy_type": self.policy_type,
            "premium": float(self.premium),
            "coverage_amount": float(self.coverage_amount),
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "status": self.status,
            "created_at": self.created_at.isoformat(),
        }