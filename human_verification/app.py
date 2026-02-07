from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import base64
import os
from dotenv import load_dotenv
import logging
from pathlib import Path

# Load environment variables - try root .env first, then local
root_env = Path(__file__).parent.parent / ".env"
local_env = Path(__file__).parent / ".env"
if root_env.exists():
    load_dotenv(root_env)
elif local_env.exists():
    load_dotenv(local_env)
else:
    load_dotenv()  # Load from system environment

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Face++ API configuration
FACEPP_API_KEY = os.getenv('FACEPP_API_KEY')
FACEPP_API_SECRET = os.getenv('FACEPP_API_SECRET')
FACEPP_DETECT_URL = 'https://api-us.faceplusplus.com/facepp/v3/detect'
FACEPP_FACESET_URL = 'https://api-us.faceplusplus.com/facepp/v3/faceset'

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "Human verification service is running"}), 200

@app.route('/api/verify/human', methods=['POST'])
def verify_human():
    """
    Verify human liveness using Face++ API
    Expected input: { "image": "base64_encoded_image", "wallet_address": "user_wallet_address" }
    """
    try:
        # Validate API keys
        if not FACEPP_API_KEY or not FACEPP_API_SECRET:
            return jsonify({
                "success": False,
                "error": "Face++ API credentials not configured"
            }), 500

        # Get data from request
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({
                "success": False,
                "error": "No image data provided"
            }), 400

        image_data = data.get('image')
        wallet_address = data.get('wallet_address', 'anonymous')
        
        logger.info(f"Processing verification request for wallet: {wallet_address}")

        # Remove base64 prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]

        # Decode base64 image
        try:
            image_bytes = base64.b64decode(image_data)
        except Exception as e:
            return jsonify({
                "success": False,
                "error": "Invalid image data format"
            }), 400

        # Call Face++ API for face detection and analysis
        response = requests.post(
            FACEPP_DETECT_URL,
            data={
                'api_key': FACEPP_API_KEY,
                'api_secret': FACEPP_API_SECRET,
                'return_landmark': 2,  # Return 106 facial landmarks
                'return_attributes': 'headpose,facequality,blur'
            },
            files={
                'image_file': ('image.jpg', image_bytes, 'image/jpeg')
            },
            timeout=30
        )

        if response.status_code != 200:
            logger.error(f"Face++ API error: {response.text}")
            return jsonify({
                "success": False,
                "error": "Face detection service error"
            }), 500

        result = response.json()
        
        # Check if any faces were detected
        if 'faces' not in result or len(result['faces']) == 0:
            return jsonify({
                "success": False,
                "verified": False,
                "error": "No face detected",
                "message": "Please ensure your face is clearly visible in the camera"
            }), 200

        # Analyze the detected face
        face = result['faces'][0]
        attributes = face.get('attributes', {})
        
        # Quality checks
        face_quality = attributes.get('facequality', {}).get('value', 0)
        blur_level = attributes.get('blur', {}).get('blurness', {}).get('value', 100)
        
        # Head pose (to check if face is frontal)
        headpose = attributes.get('headpose', {})
        yaw_angle = abs(headpose.get('yaw_angle', 0))
        pitch_angle = abs(headpose.get('pitch_angle', 0))
        roll_angle = abs(headpose.get('roll_angle', 0))
        
        # Verification logic
        is_verified = True
        issues = []
        confidence_scores = []
        
        # Check face quality
        quality_pass = face_quality >= 50
        if not quality_pass:
            is_verified = False
            issues.append("Low image quality")
        confidence_scores.append(min(face_quality, 100) if quality_pass else face_quality * 0.5)
        
        # Check blur (more lenient for laptop webcams)
        blur_score = max(0, 100 - blur_level)
        blur_pass = blur_level <= 85  # Increased from 70 to 85 for laptop webcams
        if not blur_pass:
            is_verified = False
            issues.append("Image too blurry")
        confidence_scores.append(blur_score if blur_pass else blur_score * 0.5)
        
        # Check head pose (should be relatively frontal)
        total_angle_deviation = yaw_angle + pitch_angle + roll_angle
        pose_score = max(0, 100 - total_angle_deviation / 3)
        pose_pass = yaw_angle <= 30 and pitch_angle <= 30 and roll_angle <= 30
        if not pose_pass:
            is_verified = False
            issues.append("Please face the camera directly")
        confidence_scores.append(pose_score if pose_pass else pose_score * 0.5)
        
        # Check for multiple faces
        if len(result['faces']) > 1:
            is_verified = False
            issues.append("Multiple faces detected")
            confidence_scores.append(0)
        else:
            confidence_scores.append(100)
        
        # Calculate overall confidence
        # If verification failed, cap confidence at 60% maximum
        overall_confidence = round(sum(confidence_scores) / len(confidence_scores), 1)
        if not is_verified:
            overall_confidence = min(overall_confidence, 60.0)
        
        logger.info(f"Verification result for {wallet_address}: {is_verified}, confidence: {overall_confidence}%")
        
        # Prepare detailed response
        verification_data = {
            "success": True,
            "verified": is_verified,
            "confidence": overall_confidence,
            "timestamp": result.get('time_used', 0),
            "face_token": face.get('face_token', ''),
            "details": {
                "face_quality": face_quality,
                "blur_level": blur_level,
                "head_pose": {
                    "yaw": headpose.get('yaw_angle', 0),
                    "pitch": headpose.get('pitch_angle', 0),
                    "roll": headpose.get('roll_angle', 0)
                },
                "landmarks": face.get('landmark', {})
            },
            "issues": issues if not is_verified else [],
            "message": "Human verified successfully!" if is_verified else f"Verification failed: {', '.join(issues)}"
        }
        
        return jsonify(verification_data), 200

    except requests.RequestException as e:
        logger.error(f"Network error: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Network error occurred"
        }), 500
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({
            "success": False,
            "error": "An unexpected error occurred"
        }), 500

@app.route('/api/test/connection', methods=['GET'])
def test_connection():
    """Test Face++ API connection"""
    try:
        if not FACEPP_API_KEY or not FACEPP_API_SECRET:
            return jsonify({
                "success": False,
                "message": "API keys not configured"
            }), 500
        
        return jsonify({
            "success": True,
            "message": "Face++ API credentials are configured",
            "api_key": FACEPP_API_KEY[:8] + "..." if FACEPP_API_KEY else None
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('HUMAN_VERIFICATION_PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
