#!/bin/bash

echo "Setting up Resume Intelligence Backend..."

# Create virtual environment (if using venv instead of conda)
# python3.11 -m venv venv
# source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Download spaCy model
echo "Downloading spaCy model..."
python -m spacy download en_core_web_sm

# Create necessary directories
echo "Creating directories..."
mkdir -p backend/uploads
mkdir -p backend/exports

# Create .env file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "Creating .env file..."
    cp .env.example backend/.env
    echo "Please edit backend/.env and add your GEMINI_API_KEY"
fi

echo "Backend setup complete!"
echo "Don't forget to:"
echo "1. Edit backend/.env and add your GEMINI_API_KEY"
echo "2. Start MongoDB"
echo "3. Run: cd backend && uvicorn main:app --reload"

