#!/usr/bin/env python3
"""CLI for reporting friction when using Telnyx APIs"""

import sys
import json
import re
import argparse
import subprocess
from typing import Optional

from .reporter import FrictionReporter
from .validators import ValidationError


def parse_args(args: Optional[list] = None) -> argparse.Namespace:
    """Parse command-line arguments"""
    parser = argparse.ArgumentParser(
        prog="friction-report",
        description="Report friction encountered when using Telnyx APIs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Minimal report
  friction-report \\
    --skill telnyx-webrtc-python \\
    --team webrtc \\
    --type parameter \\
    --severity major \\
    --message "API expects 'certificate' but docs say 'cert'"

  # With context
  friction-report \\
    --skill telnyx-messaging-python \\
    --team messaging \\
    --language python \\
    --type docs \\
    --severity major \\
    --message "No example for sending MMS" \\
    --context '{"endpoint":"POST /v2/messages","doc_url":"https://..."}'

  # Remote mode (requires API key)
  friction-report \\
    --skill telnyx-voice-go \\
    --team voice \\
    --type api \\
    --severity blocker \\
    --message "API returns 500 for valid request" \\
    --output remote \\
    --api-key YOUR_API_KEY

  # Watchdog mode (auto-detect friction)
  friction-report watchdog --skill telnyx-cli --team numbers -- telnyx-agent list-phone-numbers

Output:
  Reports saved to: ~/.openclaw/friction-logs/friction-*.yaml
        """,
    )
    
    # Subcommands
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Default command (report) - make it work with no subcommand
    report_parser = subparsers.add_parser('report', help='Report friction manually', add_help=False)
    watchdog_parser = subparsers.add_parser('watchdog', help='Run command with automatic friction detection')

    # Watchdog-specific arguments
    watchdog_parser.add_argument(
        "--skill",
        required=True,
        help="Skill name (e.g., telnyx-cli)",
    )
    watchdog_parser.add_argument(
        "--team",
        required=True,
        choices=["webrtc", "messaging", "voice", "numbers", "ai", "fax", "iot", "default"],
        help="Product team",
    )
    watchdog_parser.add_argument(
        "--output",
        choices=["local", "remote", "both", "auto"],
        default="auto",
        help="Output mode (default: auto)",
    )
    watchdog_parser.add_argument(
        "watchdog_command",
        nargs=argparse.REMAINDER,
        help="Command to execute (after --)",
    )

    # Report command arguments (also available at root level for backwards compat)
    for target_parser in [parser, report_parser]:
        target_parser.add_argument(
            "--skill",
            help="Skill name (e.g., telnyx-webrtc-python)",
        )
        target_parser.add_argument(
            "--team",
            choices=["webrtc", "messaging", "voice", "numbers", "ai", "fax", "iot", "default"],
            help="Product team",
        )
        target_parser.add_argument(
            "--type",
            choices=["parameter", "api", "docs", "auth"],
            help="Friction type",
        )
        target_parser.add_argument(
            "--severity",
            choices=["blocker", "major", "minor"],
            help="Severity level",
        )
        target_parser.add_argument(
            "--message",
            help="Brief description (max 200 chars)",
        )
        target_parser.add_argument(
            "--language",
            choices=["javascript", "python", "go", "ruby", "java"],
            help="SDK language (default: auto-detect)",
        )
        target_parser.add_argument(
            "--context",
            help="Additional context as JSON string",
        )
        target_parser.add_argument(
            "--output",
            choices=["local", "remote", "both", "auto"],
            default="auto",
            help="Output mode (default: auto)",
        )
        target_parser.add_argument(
            "--local-dir",
            help="Local output directory (default: ~/.openclaw/friction-logs)",
        )
        target_parser.add_argument(
            "--api-key",
            help="Telnyx API key (default: TELNYX_API_KEY env var)",
        )

    parser.add_argument(
        "--version",
        action="version",
        version="%(prog)s 0.1.0",
    )

    return parser.parse_args(args)


def run_watchdog(skill: str, team: str, command: list, output: str = "auto") -> int:
    """Run command with automatic friction detection
    
    Args:
        skill: Skill name
        team: Team name
        command: Command to execute
        output: Output mode (auto, local, remote, both)
    """
    if not command:
        print("Error: No command provided. Use: friction-report watchdog --skill <skill> --team <team> -- <command>", file=sys.stderr)
        return 1
    
    # Remove '--' separator if present
    if command[0] == '--':
        command = command[1:]
    
    print(f"🔍 Running with friction monitoring: {' '.join(command)}", file=sys.stderr)
    
    # Instantiate reporter once (reuse across detection checks)
    reporter = FrictionReporter(
        skill=skill,
        team=team,
        output=output
    )
    
    # Execute command with streaming output
    try:
        # Use Popen for streaming (though we still need to wait for completion to capture all output)
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Capture output
        stdout_data, stderr_data = process.communicate()
        
        # Print output immediately
        if stdout_data:
            print(stdout_data, end='')
        if stderr_data:
            print(stderr_data, end='', file=sys.stderr)
        
        returncode = process.returncode
        
        # Auto-detect friction
        friction_detected = False
        
        # Check 1: Non-zero exit code
        if returncode != 0:
            friction_detected = True
            try:
                results = reporter.report(
                    type="api",
                    severity="major",
                    message=f"Command failed with exit code {returncode}",
                    context={
                        "command": " ".join(command),
                        "exit_code": returncode,
                        "stderr": stderr_data[:500] if stderr_data else ""
                    }
                )
                # Show report status
                for mode, result_data in results.items():
                    if result_data["status"] == "sent":
                        print(f"\n✅ Friction reported to {mode}: {result_data.get('endpoint', 'backend')}", file=sys.stderr)
                    elif result_data["status"] == "saved":
                        print(f"\n✅ Friction saved locally: {result_data['path']}", file=sys.stderr)
                    elif result_data["status"] == "failed":
                        print(f"\n❌ Failed to report to {mode}: {result_data.get('error', 'unknown')}", file=sys.stderr)
                print(f"\n🚨 Auto-reported: Command failed (exit code {returncode})", file=sys.stderr)
            except Exception as e:
                print(f"\n⚠️  Failed to auto-report friction: {e}", file=sys.stderr)
        
        # Check 2: Error keywords in stderr (word boundary to avoid false positives)
        if stderr_data and not friction_detected:
            # Use word boundaries to avoid matching "0 errors", "error handling", etc.
            error_patterns = [
                r'\berror\b',
                r'\bfailed\b',
                r'\bexception\b',
                r'\btraceback\b',
            ]
            if any(re.search(pattern, stderr_data, re.IGNORECASE) for pattern in error_patterns):
                try:
                    reporter.report(
                        type="api",
                        severity="minor",
                        message="Error message in stderr",
                        context={
                            "command": " ".join(command),
                            "stderr": stderr_data[:500]
                        }
                    )
                    print(f"\n🚨 Auto-reported: Error detected in stderr", file=sys.stderr)
                    friction_detected = True
                except Exception as e:
                    print(f"\n⚠️  Failed to auto-report friction: {e}", file=sys.stderr)
        
        if not friction_detected:
            print(f"✅ No friction detected", file=sys.stderr)
        
        return returncode
        
    except FileNotFoundError:
        print(f"Error: Command not found: {command[0]}", file=sys.stderr)
        # Report friction for missing command
        reporter = FrictionReporter(
            skill=skill,
            team=team,
            output="auto"
        )
        try:
            reporter.report(
                type="docs",
                severity="blocker",
                message=f"Command not found: {command[0]}",
                context={"command": " ".join(command)}
            )
            print(f"\n🚨 Auto-reported: Command not found", file=sys.stderr)
        except Exception as e:
            print(f"\n⚠️  Failed to auto-report friction: {e}", file=sys.stderr)
        return 127
    except Exception as e:
        print(f"Error executing command: {e}", file=sys.stderr)
        return 1


def main(args: Optional[list] = None) -> int:
    """CLI entry point"""
    parsed = parse_args(args)
    
    # Handle watchdog command
    if parsed.command == 'watchdog':
        return run_watchdog(parsed.skill, parsed.team, parsed.watchdog_command, parsed.output)
    
    # Handle report command (default)
    # Validate required fields for report
    if not parsed.skill:
        print("Error: --skill is required", file=sys.stderr)
        return 1
    if not parsed.team:
        print("Error: --team is required", file=sys.stderr)
        return 1
    if not parsed.type:
        print("Error: --type is required", file=sys.stderr)
        return 1
    if not parsed.severity:
        print("Error: --severity is required", file=sys.stderr)
        return 1
    if not parsed.message:
        print("Error: --message is required", file=sys.stderr)
        return 1

    # Parse context JSON if provided
    context = None
    if parsed.context:
        try:
            context = json.loads(parsed.context)
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in --context: {e}", file=sys.stderr)
            return 1

    # Initialize reporter
    reporter = FrictionReporter(
        skill=parsed.skill,
        team=parsed.team,
        language=parsed.language,
        output=parsed.output,
        local_dir=parsed.local_dir,
        api_key=parsed.api_key,
    )

    # Report friction
    try:
        results = reporter.report(
            type=parsed.type,
            severity=parsed.severity,
            message=parsed.message,
            context=context,
        )

        # Print results
        for mode, result in results.items():
            if result["status"] == "saved":
                print(f"✅ {mode}: Saved to {result['path']}")
            elif result["status"] == "sent":
                print(f"✅ {mode}: Sent to {result['endpoint']}")
            elif result["status"] == "skipped":
                print(f"⏭️  {mode}: {result['reason']}")
            elif result["status"] == "failed":
                print(f"❌ {mode}: {result['error']}", file=sys.stderr)

        return 0

    except ValidationError as e:
        print(f"Validation error: {e}", file=sys.stderr)
        return 1
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
