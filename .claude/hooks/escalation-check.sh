#!/bin/bash
# Track repeated attempts and escalate when threshold hit (3)
COUNTER_FILE="/tmp/saiska-escalation-counter"
THRESHOLD=3

# Increment counter
if [ -f "$COUNTER_FILE" ]; then
  COUNT=$(cat "$COUNTER_FILE")
else
  COUNT=0
fi
COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNTER_FILE"

if [ "$COUNT" -ge "$THRESHOLD" ]; then
  echo "{\"systemMessage\": \"ESCALATION: $COUNT repeated attempts detected. Consider: python3 scripts/ask-mimo.py 'describe the problem' or switch to a different approach.\", \"continue\": true}"
  echo "$COUNT" > "$COUNTER_FILE"
else
  echo '{}'
fi
