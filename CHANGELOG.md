# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0] - 2023-03-01

### Breaking
- 5xx status code log message level is now ERROR [@ugolas](https://github.com/ugolas).
- Remove official support for node versions older than 16 [@kobik](https://github.com/kobik).

### Added
- Accepts a user function to control whether to print the log message [@ugolas](https://github.com/ugolas).
  

## [3.0.3] - 2021-03-08

### Changed

- Fix known reported vulnerabilities from [@kobik](https://github.com/kobik).

## [3.0.2] - 2020-08-16

### Changed

- Fix known reported vulnerabilities from [@ugolas](https://github.com/ugolas).

## [3.0.1] - 2019-07-01

### Changed

- Update bunyan dependencies to fix vulnerabilities from [@ugolas](https://github.com/ugolas).

## [3.0.0] - 2019-02-15

### Added

- Add CHANGELOG.md from [@ugolas](https://github.com/ugolas).

### Changed

- Removed support for objects configuration in array fields from [@ugolas](https://github.com/ugolas).
- Fixed vulnerabilities from [@ugolas](https://github.com/ugolas).
- Replaced coverage reporter from istanbul to nyc from [@ugolas](https://github.com/ugolas).
- Removed support for node 6 from [@ugolas](https://github.com/ugolas).