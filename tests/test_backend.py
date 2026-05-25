"""ApexVision AI — Backend Test Suite"""

import asyncio, math, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
os.makedirs(os.path.join(os.path.dirname(__file__),"../backend/uploads"), exist_ok=True)
os.makedirs(os.path.join(os.path.dirname(__file__),"../backend/data/chromadb"), exist_ok=True)

def run(coro): return asyncio.run(coro)

def test_incident_collision():
    from api.routes.incidents import predict, IncidentRequest, CarState
    cars = [CarState(car_id=i+1, x=400+280*math.cos(2*math.pi*i/6), y=220+160*math.sin(2*math.pi*i/6),
                     speed_kmh=250, heading_deg=math.degrees((2*math.pi*i/6)+math.pi/2)%360,
                     tyre_compound="Medium", tyre_age=20) for i in range(6)]
    cars[0].x = cars[1].x + 25; cars[0].y = cars[1].y + 5
    r = run(predict(IncidentRequest(session_id="test", cars=cars)))
    assert r["overall_risk"] > 0; assert len(r["risk_zones"]) > 0
    print(f"  PASS: {len(r['risk_zones'])} zones, risk={r['overall_risk']:.2f}")

def test_tyre_ordering():
    from api.routes.strategy import _deg
    assert _deg("Soft",30,42) > _deg("Medium",30,42) > _deg("Hard",30,42)
    print(f"  PASS: Soft > Medium > Hard degradation")

def test_tyre_curves():
    from api.routes.strategy import tyre_degradation
    r = run(tyre_degradation())
    assert set(r["degradation_curves"].keys()) >= {"Soft","Medium","Hard"}
    assert len(r["degradation_curves"]["Soft"]["points"]) == 55
    print(f"  PASS: {len(r['degradation_curves'])} compounds, 55 data points each")

def test_racing_line():
    from core.vision.racing_line import RacingLineAnalyzer
    rla = RacingLineAnalyzer()
    for i in range(200):
        a = 2*math.pi*i/200
        rla.add_position(1, 400+200*math.cos(a), 220+120*math.sin(a), 180+60*abs(math.sin(a*2)))
    r = rla.analyze_driver(1)
    assert 0 <= r["overall_score"] <= 100
    print(f"  PASS: score={r['overall_score']}, corners={r['corners_analyzed']}")

def test_optical_flow_none():
    from core.vision.optical_flow import OpticalFlowEngine
    r = OpticalFlowEngine().process_frame(None, [], 0)
    assert r["frame"] == 0 and r["car_velocities"] == {}
    print(f"  PASS: None frame handled gracefully")

def test_overtake_detection():
    from core.vision.overtake_detector import OvertakeDetector
    od = OvertakeDetector()
    od.update(0, [{"track_id":i+1,"race_position":i+1,"x":400,"y":220,"speed_kmh":250,"drs":False} for i in range(4)])
    s2 = [{"track_id":1,"race_position":2,"x":400,"y":220,"speed_kmh":265,"drs":True},
          {"track_id":2,"race_position":1,"x":400,"y":220,"speed_kmh":265,"drs":True},
          {"track_id":3,"race_position":3,"x":400,"y":220,"speed_kmh":250,"drs":False},
          {"track_id":4,"race_position":4,"x":400,"y":220,"speed_kmh":250,"drs":False}]
    evts = od.update(1, s2)
    assert len(evts) >= 1 and evts[0].car_overtaking == 2
    print(f"  PASS: {len(evts)} overtake(s) detected, type={evts[0].overtake_type}")

def test_speed_trace():
    from api.routes.analytics import speed_trace
    r = run(speed_trace("t","44"))
    assert len(r["trace"]) == 200 and all("speed_kmh" in p for p in r["trace"])
    speeds = [p["speed_kmh"] for p in r["trace"]]
    assert max(speeds) > 200 and min(speeds) > 50
    print(f"  PASS: 200 points, max={max(speeds):.0f} min={min(speeds):.0f} km/h")

def test_position_history():
    from api.routes.analytics import position_history
    r = run(position_history("s"))
    assert len(r["position_history"]) == 6
    for car, laps in r["position_history"].items():
        assert len(laps) == 78 and all(1 <= l["position"] <= 6 for l in laps)
    print(f"  PASS: 6 cars x 78 laps, valid positions")

def test_commentary_agent():
    from core.ai.langchain_agents import CommentaryAgent
    r = run(CommentaryAgent().generate({"lap":42,"total_laps":78,"leader":"Car 44","gap_p1_p2":1.8,"safety_car":False,"weather":"dry","recent_events":[],"cars":[]}))
    assert "commentary" in r and len(r["commentary"]) > 5
    assert 0.0 <= r["excitement_level"] <= 1.0
    print(f"  PASS: '{r['commentary'][:55]}...' excite={r['excitement_level']:.2f}")

def test_strategy_agent():
    from core.ai.langchain_agents import StrategyAgent
    r = run(StrategyAgent().analyze({"position":2,"lap":42,"total_laps":78,"laps_remaining":36,"tyre_compound":"Soft","tyre_age":28,"degradation_pct":95,"gap_ahead":3.2,"pitstops":1,"weather":"dry","track_temp":44,"safety_car":False,"competitors":[]}))
    assert r["action"] in ["PIT_NOW","PIT_UNDERCUT","PIT_OVERCUT","STAY_OUT","PIT_SAFETY_CAR"]
    assert 0.0 <= r["confidence"] <= 1.0
    print(f"  PASS: action={r['action']}, conf={r['confidence']:.0%}")

def test_regulation_agent():
    from core.ai.langchain_agents import RegulationRAGAgent
    r = run(RegulationRAGAgent().query("Can the driver legally pit under current safety car conditions?"))
    assert "answer" in r and len(r["answer"]) > 20
    assert r["penalty_risk"] in ["none","low","medium","high"]
    print(f"  PASS: article='{r['regulatory_article']}', risk={r['penalty_risk']}")

def test_telemetry_extractor():
    from core.vision.telemetry import TelemetryExtractor, METERS_PER_PIXEL
    # Realistic F1 sim: 2px per 80ms tick at 12.5 effective fps = ~210 km/h
    te = TelemetryExtractor(fps=12.5)
    te.extract(1, [100.0, 200.0], 0)
    r = te.extract(1, [102.0, 200.0], 1)
    expected = 2.0 * METERS_PER_PIXEL * 12.5 * 3.6
    assert 150 < r["speed_kmh"] < 300, f"Speed {r['speed_kmh']:.0f} out of F1 range"
    assert r["heading_deg"] == 0.0
    print(f"  PASS: speed={r['speed_kmh']:.1f} km/h (expected ~{expected:.0f}, F1-realistic)")

if __name__ == "__main__":
    os.chdir(os.path.join(os.path.dirname(__file__), "..", "backend"))
    tests = [
        ("Incident prediction", test_incident_collision),
        ("Tyre degradation ordering", test_tyre_ordering),
        ("Tyre degradation curves", test_tyre_curves),
        ("Racing line analysis", test_racing_line),
        ("Optical flow None frame", test_optical_flow_none),
        ("Overtake detection", test_overtake_detection),
        ("Speed trace endpoint", test_speed_trace),
        ("Position history", test_position_history),
        ("Commentary agent", test_commentary_agent),
        ("Strategy agent", test_strategy_agent),
        ("Regulation RAG agent", test_regulation_agent),
        ("Telemetry extractor", test_telemetry_extractor),
    ]
    passed, failed = 0, []
    print(f"\nApexVision AI — Backend Test Suite ({len(tests)} tests)")
    print("=" * 60)
    for name, fn in tests:
        print(f"\n[TEST] {name}")
        try:
            fn(); passed += 1
        except Exception as e:
            print(f"  FAIL: {e}"); failed.append(name)
    print(f"\n{'='*60}\nResults: {passed}/{len(tests)} passed")
    if failed:
        print(f"Failed: {failed}"); sys.exit(1)
    else:
        print("ALL TESTS PASSED")
