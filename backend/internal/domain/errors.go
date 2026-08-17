package domain

import "errors"

var (
	// Common domain errors
	ErrNotFound          = errors.New("resource not found")
	ErrAlreadyExists     = errors.New("resource already exists")
	ErrInvalidInput      = errors.New("invalid input")
	ErrUnauthorized      = errors.New("unauthorized")
	ErrForbidden         = errors.New("forbidden")
	ErrInternal          = errors.New("internal server error")
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrAccountInactive   = errors.New("account is inactive")
	ErrSecurityCheckFail = errors.New("security check failed")
	ErrHasDependencies   = errors.New("resource has dependent relations")
)
