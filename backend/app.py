from flask import Flask
from flask_cors import CORS
from auth import auth_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(auth_bp)

if __name__ == "__main__":
    app.run(debug=True, port=5000)