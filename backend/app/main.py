from fastapi import FastAPI


app = FastAPI(title="AI Xiaohongshu Backend", version="0.1.0")


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/dashboard/summary")
def dashboard_summary() -> dict[str, int]:
    return {
        "post_count": 0,
        "view_count": 0,
        "like_count": 0,
        "favorite_count": 0,
        "comment_count": 0,
        "follow_conversion_count": 0,
    }
