# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt requirements.txt

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir --upgrade pip -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Copy and set the entrypoint
COPY entrypoint.sh /app/entrypoint.sh

# Use sh to run the entrypoint which prepares DB and starts the server
CMD ["sh", "/app/entrypoint.sh"]