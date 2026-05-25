"""
ApexVision AI — FIA Regulation Knowledge Base
Pre-seeded regulation knowledge for PitWall-IQ fallback mode.
Covers the most frequently queried F1 regulations.
"""

FIA_KNOWLEDGE_BASE = [
    {
        "id": "sc_pitting",
        "question_patterns": ["safety car", "pit under sc", "pit during safety car"],
        "article": "Article 39.1",
        "source": "FIA F1 Sporting Regulations 2024",
        "answer": (
            "Under Article 39.1, any car may pit during a safety car period unless race "
            "direction has issued a specific instruction closing the pit entry. Pitting under "
            "the safety car results in approximately 17-19 seconds time loss versus 22-24 "
            "seconds under green flag conditions — a net strategic gain of 3-5 seconds."
        ),
        "penalty_risk": "none",
        "compliance_status": "compliant",
        "precedents": ["Bahrain 2021 SC strategy", "Monaco 2022 SC deployment"],
    },
    {
        "id": "drs_wet",
        "question_patterns": ["drs wet", "drs rain", "drs conditions"],
        "article": "Article 14.3",
        "source": "FIA F1 Technical Regulations 2024",
        "answer": (
            "DRS is prohibited in wet or drying conditions as determined by the race director "
            "per Article 14.3. The race director will signal DRS availability via the timing "
            "system. Activation outside permitted conditions results in a 5-second time penalty."
        ),
        "penalty_risk": "high",
        "compliance_status": "non_compliant",
        "precedents": [],
    },
    {
        "id": "track_limits",
        "question_patterns": ["track limits", "four wheels", "kerb", "white line"],
        "article": "Article 33.3",
        "source": "FIA F1 Sporting Regulations 2024",
        "answer": (
            "Article 33.3: lap times are deleted if all four wheels leave the track surface. "
            "The third violation in a session earns a formal warning; each subsequent violation "
            "carries a 5-second time penalty. Monitored corners are listed in the event notes "
            "published before each session."
        ),
        "penalty_risk": "medium",
        "compliance_status": "conditional",
        "precedents": ["Austria 2023 mass track limits investigation"],
    },
    {
        "id": "tyre_compounds",
        "question_patterns": ["two compounds", "tyre rule", "compound requirement", "both tyres"],
        "article": "Article 27.1",
        "source": "FIA F1 Sporting Regulations 2024",
        "answer": (
            "Article 27.1 requires each driver to use at least two different nominated dry-weather "
            "tyre compounds during a dry race, unless the formation lap begins behind the safety car. "
            "Failure to meet this requirement incurs a drive-through penalty (converted to 30-second "
            "post-race time penalty if taken after the penultimate lap)."
        ),
        "penalty_risk": "high",
        "compliance_status": "conditional",
        "precedents": [],
    },
    {
        "id": "unsafe_release",
        "question_patterns": ["unsafe release", "pit lane release", "pit box release"],
        "article": "Article 34.13",
        "source": "FIA F1 Sporting Regulations 2024",
        "answer": (
            "Article 34.13 prohibits releasing a car from its pit box in a way that endangers "
            "pit lane personnel or another car. An unsafe release incurs either a 5-second time "
            "penalty or a drive-through penalty depending on severity as assessed by the stewards. "
            "Repeat violations may result in a 10-second stop-and-go."
        ),
        "penalty_risk": "high",
        "compliance_status": "non_compliant",
        "precedents": [],
    },
    {
        "id": "fuel_flow",
        "question_patterns": ["fuel flow", "fuel limit", "fuel rate"],
        "article": "Article 6.5.1 / 6.5.5",
        "source": "FIA F1 Technical Regulations 2024",
        "answer": (
            "Article 6.5.1 specifies a maximum fuel flow rate of 100kg/h above 10,500 rpm. "
            "Article 6.5.5 prohibits fuel flow exceeding 100kg/h at any time. "
            "Violations are detected via the FIA fuel flow sensor and result in disqualification "
            "from the event results."
        ),
        "penalty_risk": "high",
        "compliance_status": "conditional",
        "precedents": ["Australia 2014 Red Bull fuel flow sensor ruling"],
    },
    {
        "id": "team_orders",
        "question_patterns": ["team orders", "swap positions", "let teammate past"],
        "article": "Article 39.1 (removed prohibition)",
        "source": "FIA F1 Sporting Regulations 2024",
        "answer": (
            "The previous prohibition on team orders (former Article 39.1) was removed after "
            "the 2002 Austrian GP controversy. Team orders are now permitted under current regulations. "
            "However, teams must not interfere with the result through means that bring the sport "
            "into disrepute under the International Sporting Code."
        ),
        "penalty_risk": "low",
        "compliance_status": "compliant",
        "precedents": ["Germany 2010 team orders debate"],
    },
    {
        "id": "parc_ferme",
        "question_patterns": ["parc ferme", "repair car", "change parts"],
        "article": "Article 34.5",
        "source": "FIA F1 Sporting Regulations 2024",
        "answer": (
            "Under parc fermé conditions (Article 34.5), teams may only carry out work permitted "
            "by the FIA technical delegate. Changes to front wing angle, brake bias, tyre pressures "
            "for safety, and repairs with scrutineer approval are generally permitted. "
            "Unauthorised changes result in grid penalties or disqualification."
        ),
        "penalty_risk": "medium",
        "compliance_status": "conditional",
        "precedents": [],
    },
    {
        "id": "minimum_weight",
        "question_patterns": ["minimum weight", "car weight", "driver weight"],
        "article": "Article 4.1",
        "source": "FIA F1 Technical Regulations 2024",
        "answer": (
            "Article 4.1 sets the minimum weight of the car and driver at 798kg (2024 season). "
            "The driver and their equipment must weigh at least 80kg — if lighter, ballast must "
            "be added to the seat. Cars found below minimum weight after the race face "
            "disqualification."
        ),
        "penalty_risk": "high",
        "compliance_status": "conditional",
        "precedents": [],
    },
    {
        "id": "drs_zones",
        "question_patterns": ["drs zone", "drs detection", "drs activation", "when can drs"],
        "article": "Article 14.2",
        "source": "FIA F1 Technical Regulations 2024",
        "answer": (
            "Article 14.2: DRS may only be used in designated DRS zones after the first two laps "
            "of the race. A driver may only activate DRS if they are within one second of the car "
            "ahead at the DRS detection point. DRS is automatically disabled when the driver "
            "applies the brakes."
        ),
        "penalty_risk": "medium",
        "compliance_status": "conditional",
        "precedents": [],
    },
]


def get_knowledge_by_topic(topic: str) -> dict:
    """Find the most relevant knowledge base entry for a query."""
    topic_lower = topic.lower()
    best_match = None
    best_score = 0
    for entry in FIA_KNOWLEDGE_BASE:
        score = sum(1 for pattern in entry["question_patterns"] if pattern in topic_lower)
        if score > best_score:
            best_score = score
            best_match = entry
    return best_match
