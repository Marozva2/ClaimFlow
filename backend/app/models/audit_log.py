from datetime import datetime, timezone

from app.extensions import db


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True,
    )

    claim_id = db.Column(
        db.Integer,
        db.ForeignKey("claims.id"),
        nullable=True,
    )

    action = db.Column(
        db.String(100),
        nullable=False,
    )

    description = db.Column(
        db.Text,
        nullable=False,
    )

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    user = db.relationship("User")

    claim = db.relationship(
        "Claim",
        back_populates="audit_logs",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "claim_id": self.claim_id,
            "action": self.action,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
        }