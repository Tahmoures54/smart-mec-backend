"""Timeline and copy for FARASAKOU industrial documentary."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STILLS = ROOT / "assets" / "stills"
AUDIO = ROOT / "assets" / "audio"
OVERLAYS = ROOT / "assets" / "overlays"
OUTPUT = ROOT / "output"

FPS = 24
WIDTH = 1920
HEIGHT = 1080
WIDTH_4K = 3840
HEIGHT_4K = 2160
SAMPLE_RATE = 48000

# Male documentary narrator, slower and lower for gravitas.
NARRATOR_VOICE = "fa-IR-FaridNeural"
NARRATOR_RATE = "-8%"
NARRATOR_PITCH = "-3Hz"

SCENES = [
    {
        "id": 1,
        "slug": "zagros_gulf",
        "start": 0.0,
        "duration": 15.0,
        "title_en": "FARASAKOU",
        "title_fa": "فراسکو عسلویه",
        "narration": (
            "در منتهی‌الیه کوه‌های زاگرس، جایی که کوه به خلیج فارس می‌رسد، "
            "فراسکو عسلویه آماده یک عملیات مهندسی دقیق است."
        ),
        "shots": [
            {"file": "scene01_aerial_zagros_gulf.jpg", "duration": 8.0, "motion": "right"},
            {"file": "scene01b_coast_golden_hour.jpg", "duration": 7.0, "motion": "in"},
        ],
        "grade": {"contrast": 1.08, "brightness": 0.03, "saturation": 1.12, "gamma": 1.02},
        "sfx": ["wind", "waves"],
    },
    {
        "id": 2,
        "slug": "assaluyeh_line",
        "start": 15.0,
        "duration": 20.0,
        "title_en": "36-inch National Condensate Line",
        "title_fa": "خط ۳۶ اینچ سراسری کندنسات",
        "narration": (
            "خط سی و شش اینچ سراسری کندنسات، شریان حیاتی انتقال میعانات گازی است. "
            "هدف، ایجاد انشعاب ایمن از این خط در حال سرویس به سمت مجتمع بندر "
            "و مخازن ذخیره‌سازی مواد نفتی عسلویه است."
        ),
        "shots": [
            {"file": "scene02c_tanks_unlit_flares.jpg", "duration": 10.0, "motion": "left"},
            {"file": "scene02b_36inch_line_corridor.jpg", "duration": 10.0, "motion": "in"},
        ],
        "grade": {"contrast": 1.06, "brightness": 0.02, "saturation": 1.08, "gamma": 1.0},
        "sfx": ["wind", "waves"],
    },
    {
        "id": 3,
        "slug": "live_line_cutaway",
        "start": 35.0,
        "duration": 20.0,
        "title_en": "Hot Tapping — No Shutdown",
        "title_fa": "هات‌تپ، اتصال بدون توقف",
        "narration": (
            "چالش اصلی؟ خط زنده است. فشار و جریان کندنسات ادامه دارد. "
            "راه‌حل، هات‌تپ یا اتصال گرم است؛ فناوری‌ای که بدون توقف خط، "
            "انشعاب جدید را ممکن می‌کند."
        ),
        "shots": [
            {"file": "scene03_pipe_cutaway_condensate.jpg", "duration": 10.0, "motion": "in"},
            {"file": "scene03c_cutaway_hud_clean.jpg", "duration": 10.0, "motion": "right"},
        ],
        "grade": {"contrast": 1.1, "brightness": 0.0, "saturation": 1.15, "gamma": 0.98},
        "sfx": ["fluid", "hum"],
    },
    {
        "id": 4,
        "slug": "hse_prep",
        "start": 55.0,
        "duration": 25.0,
        "title_en": "HSE — Site Preparation",
        "title_fa": "ایمنی و آماده‌سازی محل",
        "narration": (
            "تیم فراسکو با رعایت کامل اچ‌اس‌ای، محل انشعاب را آماده می‌کند. "
            "خاکبرداری، تمیزکاری، اندازه‌گیری و نصب ساپورت‌ها انجام می‌شود. "
            "تجهیزات هات‌تپ، شیر دروازه‌ای و اسپلیت‌تی آماده کارند."
        ),
        "shots": [
            {"file": "scene04_hse_crew_site_prep.jpg", "duration": 13.0, "motion": "left"},
            {"file": "scene04b_gas_detector_supports.jpg", "duration": 12.0, "motion": "in"},
        ],
        "grade": {"contrast": 1.05, "brightness": 0.02, "saturation": 1.05, "gamma": 1.0},
        "sfx": ["wind", "work"],
    },
    {
        "id": 5,
        "slug": "split_tee_valve",
        "start": 80.0,
        "duration": 30.0,
        "title_en": "Split Tee + Gate Valve",
        "title_fa": "اسپلیت‌تی و شیر دروازه‌ای",
        "narration": (
            "اسپلیت‌تی روی لوله سی و شش اینچ نصب و جوش می‌شود. "
            "تست فشار و نشت انجام می‌گیرد. سپس شیر دروازه‌ای و دستگاه "
            "هات‌تپ هیدرولیک روی فلنج قرار می‌گیرد. همه چیز آب‌بندی و کنترل می‌شود."
        ),
        "shots": [
            {"file": "scene05_split_tee_welding.jpg", "duration": 8.0, "motion": "in"},
            {"file": "scene05d_gate_valve_bolting.jpg", "duration": 7.0, "motion": "right"},
            {"file": "scene05b_pressure_test_valve_machine.jpg", "duration": 7.0, "motion": "left"},
            {"file": "scene05c_hot_tap_machine_on_flange.jpg", "duration": 8.0, "motion": "in"},
        ],
        "grade": {"contrast": 1.08, "brightness": 0.01, "saturation": 1.04, "gamma": 0.99},
        "sfx": ["weld", "hydraulic", "work"],
    },
    {
        "id": 6,
        "slug": "live_cut",
        "start": 110.0,
        "duration": 30.0,
        "title_en": "Live Cut — Zero Leak",
        "title_fa": "برش زنده، بدون نشت",
        "narration": (
            "مته راهنما وارد لوله می‌شود. کاتر هیدرولیک دیواره لوله را می‌برد. "
            "کاپون فلزی جدا می‌شود و دستگاه آن را بیرون می‌کشد. "
            "شیر بسته می‌شود و مسیر انشعاب آماده است."
        ),
        "shots": [
            {"file": "scene06_pilot_drill_live_cut.jpg", "duration": 15.0, "motion": "in"},
            {"file": "scene06c_coupon_sealed_retract.jpg", "duration": 15.0, "motion": "out"},
        ],
        "grade": {"contrast": 1.12, "brightness": 0.0, "saturation": 1.06, "gamma": 0.97},
        "sfx": ["hydraulic", "metal", "fluid"],
    },
    {
        "id": 7,
        "slug": "tanks_control",
        "start": 140.0,
        "duration": 25.0,
        "title_en": "Safe Transfer to Storage",
        "title_fa": "انتقال ایمن به مخازن",
        "narration": (
            "اکنون خط انشعاب به مجتمع بندر و مخازن ذخیره‌سازی مواد نفتی عسلویه متصل می‌شود. "
            "کندنسات با کنترل دقیق فشار و دبی، به سمت مخازن جریان می‌یابد. "
            "اتاق فرمان همه پارامترها را پایش می‌کند."
        ),
        "shots": [
            {"file": "scene07_branch_to_tanks_control.jpg", "duration": 12.0, "motion": "right"},
            {"file": "scene07b_control_room_scada.jpg", "duration": 13.0, "motion": "in"},
        ],
        "grade": {"contrast": 1.04, "brightness": 0.01, "saturation": 0.98, "gamma": 1.0},
        "sfx": ["fluid", "control", "hum"],
    },
    {
        "id": 8,
        "slug": "finale",
        "start": 165.0,
        "duration": 15.0,
        "title_en": "FARASAKOU — Safe Hot Tap, No Shutdown",
        "title_fa": "فراسکو، اتصال ایمن بدون توقف",
        "narration": (
            "فراسکو عسلویه؛ اتصال ایمن، بدون توقف تولید. "
            "از دل زاگرس تا ساحل خلیج فارس. FARASAKOU."
        ),
        "shots": [
            {"file": "scene08c_completed_no_flame.jpg", "duration": 6.0, "motion": "out"},
            {"file": "scene08_finale_zagros_gulf_port.jpg", "duration": 6.0, "motion": "left"},
            {"file": "logo_farasakou_titlecard.jpg", "duration": 3.0, "motion": "in"},
        ],
        "grade": {"contrast": 1.08, "brightness": 0.02, "saturation": 1.1, "gamma": 1.02},
        "sfx": ["wind", "waves"],
    },
]

TOTAL_DURATION = sum(s["duration"] for s in SCENES)
assert abs(TOTAL_DURATION - 180.0) < 0.01
assert abs(sum(sh["duration"] for s in SCENES for sh in s["shots"]) - 180.0) < 0.01
