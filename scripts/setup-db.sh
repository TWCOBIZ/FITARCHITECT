#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting database setup...${NC}"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}PostgreSQL is not installed.${NC}"
    echo "Please install PostgreSQL first:"
    echo "macOS: brew install postgresql"
    echo "Ubuntu: sudo apt-get install postgresql"
    echo "Windows: Download from https://www.postgresql.org/download/windows/"
    exit 1
fi

# Check if PostgreSQL service is running
if ! pg_isready &> /dev/null; then
    echo -e "${RED}PostgreSQL service is not running.${NC}"
    echo "Starting PostgreSQL service..."
    
    # Try to start PostgreSQL service based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start postgresql
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo service postgresql start
    else
        echo "Please start PostgreSQL service manually"
        exit 1
    fi
fi

# Create database if it doesn't exist
DB_NAME="fitarchitect"
if ! psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${YELLOW}Creating database $DB_NAME...${NC}"
    createdb $DB_NAME
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Database created successfully${NC}"
    else
        echo -e "${RED}Failed to create database${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Database $DB_NAME already exists${NC}"
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    echo "DATABASE_URL=\"postgresql://postgres:postgres@localhost:5432/fitarchitect\"" > .env
    echo -e "${GREEN}.env file created${NC}"
    echo -e "${YELLOW}Please update the DATABASE_URL in .env with your actual PostgreSQL credentials${NC}"
fi

# Install Prisma dependencies if not already installed
if [ ! -d "node_modules/@prisma" ]; then
    echo -e "${YELLOW}Installing Prisma dependencies...${NC}"
    npm install @prisma/client
    npm install prisma --save-dev
fi

# Generate Prisma client and push schema
echo -e "${YELLOW}Generating Prisma client...${NC}"
npx prisma generate

echo -e "${YELLOW}Pushing database schema...${NC}"
npx prisma db push

echo -e "${GREEN}Database setup completed successfully!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update the DATABASE_URL in .env with your actual PostgreSQL credentials"
echo "2. Run 'npx prisma studio' to view and manage your database" 