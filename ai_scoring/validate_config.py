"""
Configuration Validator
Checks if all required configurations are set correctly
"""

import os
import sys
from dotenv import load_dotenv
from pathlib import Path

# Load environment - try root .env first, then local
root_env = Path(__file__).parent.parent / ".env"
local_env = Path(__file__).parent / ".env"
if root_env.exists():
    load_dotenv(root_env)
elif local_env.exists():
    load_dotenv(local_env)
else:
    load_dotenv()  # Load from system environment

class ConfigValidator:
    """Validates TigerTrust configuration"""
    
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.info = []
    
    def validate_required(self, var_name: str, description: str):
        """Validate a required environment variable"""
        value = os.getenv(var_name)
        if not value:
            self.errors.append(f"❌ {var_name} is required ({description})")
            return False
        else:
            self.info.append(f"✓ {var_name}: {value[:20]}...")
            return True
    
    def validate_optional(self, var_name: str, default: str, description: str):
        """Validate an optional environment variable"""
        value = os.getenv(var_name, default)
        self.info.append(f"✓ {var_name}: {value} ({description})")
        return True
    
    def validate_url(self, var_name: str, description: str):
        """Validate a URL environment variable"""
        value = os.getenv(var_name)
        if not value:
            self.errors.append(f"❌ {var_name} is required ({description})")
            return False
        
        if not value.startswith(('http://', 'https://')):
            self.warnings.append(f"⚠️  {var_name} should start with http:// or https://")
        
        self.info.append(f"✓ {var_name}: {value}")
        return True
    
    def validate_port(self, var_name: str, default: int, description: str):
        """Validate a port number"""
        value = os.getenv(var_name, str(default))
        try:
            port = int(value)
            if port < 1 or port > 65535:
                self.warnings.append(f"⚠️  {var_name} should be between 1-65535")
            else:
                self.info.append(f"✓ {var_name}: {port} ({description})")
            return True
        except ValueError:
            self.errors.append(f"❌ {var_name} must be a number")
            return False
    
    def validate_gemini_api_key(self):
        """Validate Gemini API key"""
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            self.errors.append("❌ GEMINI_API_KEY is required")
            self.info.append("   Get one from: https://makersuite.google.com/app/apikey")
            return False
        
        if len(api_key) < 20:
            self.warnings.append("⚠️  GEMINI_API_KEY seems too short")
        
        self.info.append(f"✓ GEMINI_API_KEY: {api_key[:10]}...{api_key[-10:]}")
        return True
    
    def validate_solana_program_id(self):
        """Validate Solana program ID"""
        program_id = os.getenv('TIGERTRUST_PROGRAM_ID')
        if not program_id:
            self.errors.append("❌ TIGERTRUST_PROGRAM_ID is required")
            self.info.append("   Deploy the Anchor program and set this value")
            return False
        
        # Basic validation - Solana addresses are base58 and typically 32-44 chars
        if len(program_id) < 32 or len(program_id) > 44:
            self.warnings.append("⚠️  TIGERTRUST_PROGRAM_ID length seems unusual")
        
        self.info.append(f"✓ TIGERTRUST_PROGRAM_ID: {program_id}")
        return True
    
    def validate_interval(self):
        """Validate update interval"""
        interval = os.getenv('SCORE_UPDATE_INTERVAL_HOURS', '24')
        try:
            hours = int(interval)
            if hours < 1:
                self.warnings.append("⚠️  SCORE_UPDATE_INTERVAL_HOURS should be at least 1")
            elif hours > 168:  # 1 week
                self.warnings.append("⚠️  SCORE_UPDATE_INTERVAL_HOURS is very long (>1 week)")
            else:
                self.info.append(f"✓ SCORE_UPDATE_INTERVAL_HOURS: {hours} hours")
            return True
        except ValueError:
            self.errors.append("❌ SCORE_UPDATE_INTERVAL_HOURS must be a number")
            return False
    
    def validate_all(self):
        """Run all validations"""
        print("\n" + "="*60)
        print("TigerTrust Configuration Validation")
        print("="*60 + "\n")
        
        # Required configurations
        print("Checking required configurations...\n")
        self.validate_gemini_api_key()
        self.validate_url('SOLANA_RPC_URL', 'Solana RPC endpoint')
        self.validate_solana_program_id()
        
        # Optional configurations
        print("\nChecking optional configurations...\n")
        self.validate_optional(
            'GEMINI_MODEL',
            'gemini-2.0-flash-exp',
            'Gemini model'
        )
        self.validate_port('AI_SCORING_PORT', 5001, 'API port')
        self.validate_interval()
        self.validate_optional(
            'LOG_LEVEL',
            'INFO',
            'Logging level'
        )
        
        # Print results
        self._print_results()
        
        return len(self.errors) == 0
    
    def _print_results(self):
        """Print validation results"""
        print("\n" + "="*60)
        print("Validation Results")
        print("="*60 + "\n")
        
        if self.info:
            print("✅ Configuration Details:")
            for msg in self.info:
                print(f"   {msg}")
            print()
        
        if self.warnings:
            print("⚠️  Warnings:")
            for msg in self.warnings:
                print(f"   {msg}")
            print()
        
        if self.errors:
            print("❌ Errors:")
            for msg in self.errors:
                print(f"   {msg}")
            print()
            print("❌ Configuration validation FAILED")
            print("\nPlease fix the errors above and try again.")
            print("Refer to .env.example for configuration template.\n")
        else:
            print("✅ Configuration validation PASSED")
            if self.warnings:
                print("⚠️  However, there are some warnings to review.\n")
            else:
                print("🎉 All configurations are valid!\n")


def main():
    """Run configuration validation"""
    
    # Check if .env exists
    if not os.path.exists('.env'):
        print("\n❌ .env file not found!")
        print("\nPlease create a .env file from .env.example:")
        print("  cp .env.example .env")
        print("\nThen edit .env and add your configuration values.\n")
        sys.exit(1)
    
    # Run validation
    validator = ConfigValidator()
    success = validator.validate_all()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
