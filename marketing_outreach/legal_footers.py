"""
Country-specific legal footers for the BioMedMeet outreach campaign.

PRIVACY GUARANTEE: these footers NEVER reference the recipient's email
address. The recipient receives the email via the SMTP envelope (BCC pattern),
their address is invisible in headers AND in the body — even if the message
is forwarded.

This is engineering hygiene, not legal advice. Have your legal counsel
review before mass-sending in EU/UK or India.
"""

LEGAL_FOOTERS = {
    # ----------------------------------------------------------------------
    # United States — CAN-SPAM Act (15 U.S.C. §§ 7701–7713)
    # ----------------------------------------------------------------------
    "US": """
        <p style="font-size:11px; color:#9ca3af; line-height:1.5; margin:24px 0 0;">
            This message is a commercial introduction from BioMedMeet
            (Hospital Case Meeting Scheduler) to healthcare decision-makers.
            We believe this product is relevant to your organisation's digital
            transformation team. If we are mistaken, we apologise.
            <br/><br/>
            Sender postal address: <strong>{sender_postal_address}</strong>.
            <br/><br/>
            To stop receiving emails from BioMedMeet, simply reply to this
            message with the word <strong>UNSUBSCRIBE</strong> in the subject
            or body. We will remove you within 10 business days as required
            under the CAN-SPAM Act of 2003.
        </p>
    """,

    # ----------------------------------------------------------------------
    # European Union / United Kingdom — GDPR + ePrivacy / PECR
    # ----------------------------------------------------------------------
    "EU": """
        <p style="font-size:11px; color:#9ca3af; line-height:1.5; margin:24px 0 0;">
            We are contacting you under the lawful basis of
            <strong>legitimate interest</strong> (Article 6(1)(f) GDPR) — namely,
            to introduce a healthcare workflow product to professionals in
            roles responsible for hospital digital transformation. We have
            weighed our interest against your right to privacy and consider
            this contact proportionate, professionally relevant, and
            non-intrusive.
            <br/><br/>
            Data controller: <strong>{sender_name}</strong>, postal address
            <strong>{sender_postal_address}</strong>, contact:
            <a href="mailto:{sender_email}">{sender_email}</a>.
            <br/><br/>
            You have the right to: object to this processing at any time;
            request access to, correction of, or erasure of your data; lodge a
            complaint with your national supervisory authority. To object,
            simply reply with <strong>UNSUBSCRIBE</strong> and we will
            permanently delete your record within 30 days.
        </p>
    """,
    "UK": None,  # filled below

    # ----------------------------------------------------------------------
    # India — Digital Personal Data Protection Act 2023 (DPDP)
    # ----------------------------------------------------------------------
    "IN": """
        <p style="font-size:11px; color:#9ca3af; line-height:1.5; margin:24px 0 0;">
            This message is a professional B2B introduction. Under the Digital
            Personal Data Protection Act 2023, we process the minimum data
            necessary (your professional contact details) to make this
            introduction. We do not retain, sell, or share your data with
            third parties.
            <br/><br/>
            Sender: <strong>{sender_name}</strong>, postal address
            <strong>{sender_postal_address}</strong>, contact:
            <a href="mailto:{sender_email}">{sender_email}</a>.
            <br/><br/>
            To withdraw consent and have your record permanently deleted,
            reply with <strong>UNSUBSCRIBE</strong>. We will action this
            within 7 days.
        </p>
    """,

    # ----------------------------------------------------------------------
    # Generic fallback
    # ----------------------------------------------------------------------
    "DEFAULT": """
        <p style="font-size:11px; color:#9ca3af; line-height:1.5; margin:24px 0 0;">
            This message is a professional B2B introduction.
            Sender: <strong>{sender_name}</strong>, postal address
            <strong>{sender_postal_address}</strong>, contact:
            <a href="mailto:{sender_email}">{sender_email}</a>.
            <br/><br/>
            To stop receiving emails from us, reply with
            <strong>UNSUBSCRIBE</strong> and we will remove your record
            within 10 business days.
        </p>
    """,
}

LEGAL_FOOTERS["UK"] = LEGAL_FOOTERS["EU"]


def get_footer(country: str) -> str:
    """Return the HTML footer template for the given country code."""
    return LEGAL_FOOTERS.get(country.upper(), LEGAL_FOOTERS["DEFAULT"])
