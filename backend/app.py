from flask import Flask
from flask_cors import CORS

from auth import auth_bp
from watchlist import watchlist_bp
from trades import trades_bp
from stocks import stocks_bp
from predict_api import predict_bp
from alerts import alerts_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(auth_bp)
app.register_blueprint(watchlist_bp)
app.register_blueprint(trades_bp)
app.register_blueprint(stocks_bp)
app.register_blueprint(predict_bp)
app.register_blueprint(alerts_bp)


@app.route("/api/health", methods=["GET"])
def health():
    return {"status": "ok"}, 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)
