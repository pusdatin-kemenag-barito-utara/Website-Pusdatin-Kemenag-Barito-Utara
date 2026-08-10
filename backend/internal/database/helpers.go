package database

import (
	"encoding/json"
	"time"
)

// asTime normalizes a scanned timestamp value (time.Time or string) to time.Time.
func asTime(v any) time.Time {
	switch t := v.(type) {
	case time.Time:
		return t
	case string:
		parsed, _ := time.Parse(time.RFC3339, t)
		return parsed
	default:
		return time.Time{}
	}
}

// marshalFeatures serializes a features slice for jsonb columns.
func marshalFeatures(features []any) ([]byte, error) {
	if features == nil {
		features = []any{}
	}
	return json.Marshal(features)
}
