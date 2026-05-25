"""
ApexVision AI — IBM Granite Commentary Service
Powered by Watsonx.ai — PitLane Pulse Engine
"""

import asyncio
import httpx
import json
from typing import Optional, Dict, Any

from config.settings import settings


COMMENTARY_SYSTEM_PROMPT = """You are PitLane Pulse, an elite AI motorsport commentator for ApexVision AI.
You have the knowledge of a seasoned Formula 1 race engineer, strategist, and broadcast commentator combined.

Your commentary style:
- Technically precise yet thrilling
- Uses racing terminology naturally
- Builds narrative tension
- References tire compounds, DRS, ERS deployment, undercuts, safety car strategy
- Sounds like a world-class broadcast commentator
- Calibrates excitement to the drama level of the moment

Always respond with a JSON object:
{
  "commentary": "the main commentary line",
  "event_type": "event category",
  "excitement_level": 0.0-1.0,
  "tts_ready": "clean text for text-to-speech",
  "tactical_insight": "optional engineering insight"
}"""


COACHING_SYSTEM_PROMPT = """You are ApexCoach AI, an elite motorsport driver coach.
Analyze driver telemetry and provide precise, actionable coaching advice.
Focus on: braking points, racing line optimization, throttle application, tire management.
Be direct, specific, and use exact technical references (turn numbers, distances, percentages).
Respond only in JSON format."""


STRATEGY_SYSTEM_PROMPT = """You are RaceMind AI, a world-class Formula 1 race strategist.
Analyze race conditions and provide optimal pit-stop and tire strategy recommendations.
Consider: tire degradation rates, undercut/overcut opportunities, safety car probability,
weather changes, rival strategies, fuel load effects.
Provide confidence scores for each recommendation.
Respond only in JSON format."""


class GraniteCommentaryService:
    """IBM Granite powered commentary, coaching, and strategy service"""

    def __init__(self):
        self.watsonx_url = settings.IBM_WATSONX_URL
        self.api_key = settings.IBM_WATSONX_API_KEY
        self.project_id = settings.IBM_PROJECT_ID
        self.model_id = settings.IBM_GRANITE_MODEL
        self._token: Optional[str] = None

    async def _get_iam_token(self) -> str:
        """Get IBM IAM access token"""
        if self._token:
            return self._token

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://iam.cloud.ibm.com/identity/token",
                data={
                    "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
                    "apikey": self.api_key,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            data = resp.json()
            self._token = data.get("access_token", "")
            return self._token

    async def _call_granite(
        self,
        prompt: str,
        system_prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.7,
    ) -> str:
        """Call IBM Granite via Watsonx.ai"""
        token = await self._get_iam_token()

        payload = {
            "model_id": self.model_id,
            "input": f"<|system|>\n{system_prompt}\n<|user|>\n{prompt}\n<|assistant|>\n",
            "parameters": {
                "max_new_tokens": max_tokens,
                "temperature": temperature,
                "top_p": 0.9,
                "top_k": 50,
                "repetition_penalty": 1.1,
                "stop_sequences": ["<|user|>", "<|system|>"],
            },
            "project_id": self.project_id,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.watsonx_url}/ml/v1/text/generation?version=2023-05-29",
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )

            if resp.status_code != 200:
                # Fallback to demo mode
                return await self._demo_response(prompt, system_prompt)

            data = resp.json()
            return data.get("results", [{}])[0].get("generated_text", "")

    async def _demo_response(self, prompt: str, system_prompt: str) -> str:
        """Fallback demo responses when Watsonx is not configured"""
        demo_responses = {
            "commentary": json.dumps({
                "commentary": "Driver 11 has found significant time under braking into Turn 4, consistently arriving 12 meters later than the car ahead. This aggressive approach is generating overtaking pressure but placing heavy thermal load on the rear tires.",
                "event_type": "tactical_pressure",
                "excitement_level": 0.78,
                "tts_ready": "Driver 11 has found significant time under braking into Turn 4, arriving 12 meters later than the car ahead.",
                "tactical_insight": "Rear tire degradation risk elevated by 34% based on current braking patterns",
            }),
            "coaching": json.dumps({
                "braking_analysis": "Braking 8 meters too early into Turn 1. Reference point: 100-meter board. Potential gain: 0.3 seconds per lap.",
                "throttle_application": "Throttle application post apex is 15% below optimal. Increase progressive throttle from 40m after apex.",
                "racing_line": "Running 1.2 meters wide in Turn 7 complex. Tighter entry enables earlier power application.",
                "overall_score": 73,
                "recommendations": ["Adjust braking point Turn 1", "Earlier throttle application exit Turn 7", "Reduce steering lock into Turn 4 for reduced scrub"],
            }),
            "strategy": json.dumps({
                "recommendation": "Pit now for Medium compound. Undercut window open against Car 7. Estimated position gain: +2.",
                "confidence": 0.84,
                "tyre_strategy": "Medium -> Hard",
                "optimal_pit_window": [32, 36],
                "undercut_risk": "High probability Car 7 pits within 2 laps",
                "weather_factor": "Dry conditions stable for 20 laps",
            }),
        }

        if "commentary" in system_prompt.lower() or "pitlane" in system_prompt.lower():
            return demo_responses["commentary"]
        elif "coach" in system_prompt.lower():
            return demo_responses["coaching"]
        elif "strateg" in system_prompt.lower():
            return demo_responses["strategy"]

        return json.dumps({"response": "ApexVision AI operational in demo mode"})

    async def generate(
        self,
        race_state: Dict[str, Any],
        mode: str = "broadcast",
        language: str = "en",
        excitement_level: float = 0.7,
    ) -> Dict[str, Any]:
        """Generate race commentary"""
        prompt = f"""
Race State:
- Lap: {race_state.get('lap', 0)}/{race_state.get('total_laps', 78)}
- Leader: {race_state.get('leader', 'Car 1')}
- Gap P1-P2: {race_state.get('gap_p1_p2', '1.2s')}
- Safety Car Active: {race_state.get('safety_car', False)}
- Weather: {race_state.get('weather', 'dry')}
- Recent Events: {race_state.get('recent_events', [])}
- Cars on Track: {race_state.get('cars', [])}

Generate {mode} commentary. Excitement level: {excitement_level:.1f}/1.0
Language: {language}
"""
        raw = await self._call_granite(prompt, COMMENTARY_SYSTEM_PROMPT, temperature=0.8)

        try:
            clean = raw.strip()
            if clean.startswith("```"):
                clean = clean.split("```")[1].strip()
                if clean.startswith("json"):
                    clean = clean[4:].strip()
            return json.loads(clean)
        except Exception:
            return {
                "commentary": raw.strip() or "Race analysis in progress...",
                "event_type": "general",
                "excitement_level": excitement_level,
                "tts_ready": raw.strip() or "Race analysis in progress.",
                "tactical_insight": None,
            }

    async def generate_event_commentary(
        self,
        event_type: str,
        details: Dict[str, Any],
        lap: int,
        car_id: Optional[int] = None,
        car_id_2: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Generate commentary for a specific race event"""
        prompt = f"""
Event: {event_type}
Lap: {lap}
Car: {car_id}
Car 2 (if applicable): {car_id_2}
Details: {json.dumps(details, indent=2)}

Generate compelling commentary for this specific event.
"""
        raw = await self._call_granite(prompt, COMMENTARY_SYSTEM_PROMPT, temperature=0.85)
        try:
            clean = raw.strip()
            if "```" in clean:
                clean = clean.split("```")[1].strip()
                if clean.startswith("json"):
                    clean = clean[4:].strip()
            return json.loads(clean)
        except Exception:
            return {
                "commentary": raw.strip() or f"Significant {event_type} event on lap {lap}",
                "event_type": event_type,
                "excitement_level": 0.8,
                "tts_ready": raw.strip() or f"Significant event on lap {lap}",
                "tactical_insight": None,
            }

    async def get_demo_commentary(self) -> list:
        """Get pre-generated demo commentary lines"""
        return [
            {
                "commentary": "Car 44 has arrived 14 meters later into Turn 1 on this lap. The braking differential is creating massive instability for Car 7 ahead who has now lost DRS detection range.",
                "event_type": "tactical_pressure",
                "excitement_level": 0.82,
                "timestamp": 0,
            },
            {
                "commentary": "The undercut attempt by the Silver team is live. Their out-lap pace on fresh Mediums is three-tenths faster than anything on track. If Car 7 does not respond at the next opportunity, track position will be lost.",
                "event_type": "pit_strategy",
                "excitement_level": 0.91,
                "timestamp": 8,
            },
            {
                "commentary": "Caution flagged at Turn 9. Debris on the racing line. Three cars in the braking zone simultaneously — the proximity analysis is registering a high-risk scenario. Safety car deployment probability now at 76 percent.",
                "event_type": "incident_warning",
                "excitement_level": 0.96,
                "timestamp": 16,
            },
            {
                "commentary": "Sector 2 is where the championship is being decided today. Car 11 has found four-tenths through the medium-speed complex, entirely through later throttle application in the exit phase of Turn 6.",
                "event_type": "performance_insight",
                "excitement_level": 0.74,
                "timestamp": 24,
            },
            {
                "commentary": "Tire degradation alert for Car 33. The rear graining pattern detected over the last eight laps suggests structural integrity is approaching the threshold. Pit window opens in three laps.",
                "event_type": "tyre_warning",
                "excitement_level": 0.85,
                "timestamp": 32,
            },
        ]

    async def generate_coaching(self, telemetry: Dict[str, Any]) -> Dict[str, Any]:
        """Generate driver coaching insights"""
        prompt = f"""
Driver Telemetry Data:
{json.dumps(telemetry, indent=2)}

Analyze this driver's performance and provide specific coaching recommendations.
"""
        raw = await self._call_granite(prompt, COACHING_SYSTEM_PROMPT, temperature=0.5)
        try:
            clean = raw.strip()
            if "```" in clean:
                clean = clean.split("```")[1].strip()
                if clean.startswith("json"):
                    clean = clean[4:].strip()
            return json.loads(clean)
        except Exception:
            return {"raw_coaching": raw, "error": "parse_failed"}

    async def generate_strategy(self, race_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate race strategy recommendations"""
        prompt = f"""
Current Race Data:
{json.dumps(race_data, indent=2)}

Generate optimal pit-stop and tire strategy recommendations.
"""
        raw = await self._call_granite(prompt, STRATEGY_SYSTEM_PROMPT, temperature=0.4)
        try:
            clean = raw.strip()
            if "```" in clean:
                clean = clean.split("```")[1].strip()
                if clean.startswith("json"):
                    clean = clean[4:].strip()
            return json.loads(clean)
        except Exception:
            return {"raw_strategy": raw, "error": "parse_failed"}
