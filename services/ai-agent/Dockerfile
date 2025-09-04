FROM public.ecr.aws/docker/library/python:3.12-slim

# Copy requirements.txt
COPY requirements.txt .

# Install the specified packages
RUN pip install -r requirements.txt

# Copy function code
COPY index.py .

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "python", "index.py" ]
