#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Ensuring database is running...${NC}"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}PostgreSQL is not installed.${NC}"
    echo "Please install PostgreSQL first:"
    echo "macOS: brew install postgresql"
    echo "Ubuntu: sudo apt-get install postgresql"
    exit 1
fi

# Check if PostgreSQL service is running
if ! pg_isready &> /dev/null; then
    echo -e "${YELLOW}Starting PostgreSQL service...${NC}"
    
    # Try to start PostgreSQL service based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start postgresql
        sleep 2
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo service postgresql start
        sleep 2
    else
        echo -e "${RED}Please start PostgreSQL service manually${NC}"
        exit 1
    fi
    
    # Verify service started
    if pg_isready &> /dev/null; then
        echo -e "${GREEN}PostgreSQL service started successfully${NC}"
    else
        echo -e "${RED}Failed to start PostgreSQL service${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}PostgreSQL service is already running${NC}"
fi

# Check if database exists
DB_NAME="fitarchitect"
if ! psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${YELLOW}Database $DB_NAME not found. Run 'npm run db:setup' to create it.${NC}"
    exit 1
else
    echo -e "${GREEN}Database $DB_NAME is available${NC}"
fi

echo -e "${GREEN}Database environment ready!${NC}"