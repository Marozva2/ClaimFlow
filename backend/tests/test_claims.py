from datetime import date, timedelta
from decimal import Decimal

from flask_jwt_extended import create_access_token
from models import AuditLog, Claim, Policy, User, db


def create_user(email, role="customer"):
    user = User(
        email=email,
        first_name="Test",
        last_name="User",
        role=role,
    )
    user.set_password("password123")
    db.session.add(user)
    db.session.flush()
    return user


def auth_headers(user):
    token = create_access_token(identity=str(user.id))
    return {"Authorization": f"Bearer {token}"}


def create_policy(user):
    policy = Policy(
        policy_number=f"POL-{user.id}",
        user_id=user.id,
        policy_type="Auto",
        premium=Decimal("100.00"),
        coverage_amount=Decimal("10000.00"),
        start_date=date.today() - timedelta(days=1),
        end_date=date.today() + timedelta(days=365),
        status="active",
    )
    db.session.add(policy)
    db.session.commit()
    return policy


def test_customer_can_only_view_own_claims(client, app):
    with app.app_context():
        owner = create_user("owner@example.com")
        other = create_user("other@example.com")
        officer = create_user("queue-officer@example.com", "claims_officer")
        owner_policy = create_policy(owner)
        other_policy = create_policy(other)
        own_claim = Claim(
            claim_number="CLM-OWN",
            policy_id=owner_policy.id,
            description="Own claim",
            amount_claimed=Decimal("100.00"),
        )
        other_claim = Claim(
            claim_number="CLM-OTHER",
            policy_id=other_policy.id,
            description="Other claim",
            amount_claimed=Decimal("100.00"),
        )
        db.session.add_all([own_claim, other_claim])
        db.session.commit()
        own_id, other_id = own_claim.id, other_claim.id
        headers = auth_headers(owner)
        officer_headers = auth_headers(officer)

    response = client.get("/api/v1/claims", headers=headers)
    assert response.status_code == 200
    assert [claim["claim_number"] for claim in response.get_json()["claims"]] == [
        "CLM-OWN"
    ]
    assert "customer" not in response.get_json()["claims"][0]
    assert client.get(f"/api/v1/claims/{other_id}", headers=headers).status_code == 404
    assert client.get(f"/api/v1/claims/{own_id}", headers=headers).status_code == 200
    staff_response = client.get("/api/v1/claims", headers=officer_headers)
    staff_claim = next(
        claim for claim in staff_response.get_json()["claims"] if claim["id"] == own_id
    )
    assert staff_claim["customer"]["email"] == "owner@example.com"
    assert staff_claim["policy"]["policy_number"] == "POL-1"


def test_claim_submission_requires_owned_eligible_policy(client, app):
    with app.app_context():
        owner = create_user("submitter@example.com")
        other = create_user("policy-owner@example.com")
        policy = create_policy(other)
        headers = auth_headers(owner)
        policy_id = policy.id

    response = client.post(
        "/api/v1/claims",
        headers=headers,
        json={
            "policy_id": policy_id,
            "description": "Accident damage",
            "amount_claimed": 500,
        },
    )
    assert response.status_code == 404


def test_claim_lifecycle_is_role_gated_and_audited(client, app):
    with app.app_context():
        customer = create_user("claimant@example.com")
        officer = create_user("officer@example.com", "claims_officer")
        unrelated = create_user("unrelated-audit@example.com")
        policy = create_policy(customer)
        claim = Claim(
            claim_number="CLM-WORKFLOW",
            policy_id=policy.id,
            description="Accident damage",
            amount_claimed=Decimal("500.00"),
        )
        db.session.add(claim)
        db.session.commit()
        claim_id = claim.id
        customer_headers = auth_headers(customer)
        officer_headers = auth_headers(officer)
        unrelated_headers = auth_headers(unrelated)

    transition_url = f"/api/v1/claims/{claim_id}/transitions"
    denied = client.post(
        transition_url,
        headers=customer_headers,
        json={"status": "settled"},
    )
    assert denied.status_code == 403

    invalid = client.post(
        transition_url,
        headers=officer_headers,
        json={"status": "settled"},
    )
    assert invalid.status_code == 422
    start_review = client.post(
        transition_url,
        headers=officer_headers,
        json={"status": "under_review"},
    )
    assert start_review.status_code == 200
    decision_without_assessment = client.post(
        transition_url,
        headers=officer_headers,
        json={"status": "approved", "amount_approved": 400},
    )
    assert decision_without_assessment.status_code == 422
    inaccessible_audit = client.get(
        f"/api/v1/claims/{claim_id}/audit",
        headers=unrelated_headers,
    )
    assert inaccessible_audit.status_code == 404

    assessment = client.post(
        "/api/v1/assessments",
        headers=officer_headers,
        json={
            "claim_id": claim_id,
            "recommendation": "approve",
            "approved_amount": 400,
            "notes": "Assessment complete",
        },
    )
    assert assessment.status_code == 201

    approved = client.post(
        transition_url,
        headers=officer_headers,
        json={"status": "approved", "amount_approved": 400},
    )
    assert approved.status_code == 200

    with app.app_context():
        claim = db.session.get(Claim, claim_id)
        assert claim.status == "approved"
        assert claim.amount_approved == Decimal("400.00")
        assert AuditLog.query.filter_by(claim_id=claim_id).count() == 3
    audit = client.get(f"/api/v1/claims/{claim_id}/audit", headers=customer_headers)
    assert audit.status_code == 200
    assert len(audit.get_json()["events"]) == 3


def test_assessment_requires_staff_role(client, app):
    with app.app_context():
        customer = create_user("assessment-customer@example.com")
        db.session.commit()
        headers = auth_headers(customer)

    response = client.get("/api/v1/assessments", headers=headers)
    assert response.status_code == 403


def test_claim_queue_paginates_and_filters_server_side(client, app):
    with app.app_context():
        customer = create_user("queue-customer@example.com")
        policy = create_policy(customer)
        for index in range(2):
            db.session.add(
                Claim(
                    claim_number=f"CLM-QUEUE-{index}",
                    policy_id=policy.id,
                    description=f"Vehicle damage {index}",
                    amount_claimed=Decimal("100.00"),
                )
            )
        db.session.commit()
        headers = auth_headers(customer)

    response = client.get(
        "/api/v1/claims?page=1&per_page=1&q=vehicle&status=submitted",
        headers=headers,
    )
    assert response.status_code == 200
    data = response.get_json()
    assert len(data["claims"]) == 1
    assert data["pagination"] == {
        "page": 1,
        "per_page": 1,
        "total": 2,
        "pages": 2,
    }


def test_admin_endpoints_are_role_restricted_and_read_only(client, app):
    with app.app_context():
        customer = create_user("regular-user@example.com")
        admin = create_user("admin-user@example.com", "admin")
        db.session.add(
            AuditLog(
                user_id=admin.id,
                action="test_activity",
                description="Administrative audit test.",
            )
        )
        db.session.commit()
        customer_headers = auth_headers(customer)
        admin_headers = auth_headers(admin)

    assert client.get(
        "/api/v1/admin/users", headers=customer_headers
    ).status_code == 403
    users = client.get("/api/v1/admin/users", headers=admin_headers)
    assert users.status_code == 200
    assert users.get_json()["users"]
    assert "password_hash" not in users.get_json()["users"][0]
    audit = client.get("/api/v1/admin/audit", headers=admin_headers)
    assert audit.status_code == 200
    assert audit.get_json()["events"][0]["action"] == "test_activity"
