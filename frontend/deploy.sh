#!/bin/bash

echo "Building React frontend..."
npm run build

echo "Copying build to Nginx folder..."
sudo rm -rf /var/www/project-tracker/*
sudo cp -r dist/* /var/www/project-tracker/

echo "Restarting Nginx..."
sudo systemctl restart nginx

echo "Frontend deployed successfully!"
