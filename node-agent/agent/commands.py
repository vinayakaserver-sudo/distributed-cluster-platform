import os
import sys
import logging
import asyncio
from agent.schemas import NodeCommand, CommandResult, CommandType
from agent.config import config

logger = logging.getLogger(__name__)

# Global flag to track if the node is disabled
is_node_disabled = False

class CommandProcessor:
    def process_command(self, command: NodeCommand, service_registry) -> CommandResult:
        global is_node_disabled
        try:
            if command.command_type == CommandType.PING:
                return CommandResult(
                    command_id=command.command_id,
                    node_id=config.NODE_ID,
                    success=True,
                    output="pong",
                    error=None
                )
            elif command.command_type == CommandType.RESTART:
                asyncio.create_task(self._restart_delayed())
                return CommandResult(
                    command_id=command.command_id,
                    node_id=config.NODE_ID,
                    success=True,
                    output="Restarting in 1 second...",
                    error=None
                )
            elif command.command_type == CommandType.DISABLE:
                is_node_disabled = True
                return CommandResult(
                    command_id=command.command_id,
                    node_id=config.NODE_ID,
                    success=True,
                    output="Node disabled",
                    error=None
                )
            elif command.command_type == CommandType.ENABLE:
                is_node_disabled = False
                return CommandResult(
                    command_id=command.command_id,
                    node_id=config.NODE_ID,
                    success=True,
                    output="Node enabled",
                    error=None
                )
            elif command.command_type == CommandType.COLLECT_LOGS:
                logs = self._get_tail_logs()
                return CommandResult(
                    command_id=command.command_id,
                    node_id=config.NODE_ID,
                    success=True,
                    output=logs,
                    error=None
                )
            elif command.command_type == CommandType.UPDATE_CONFIG:
                for k, v in command.payload.items():
                    if hasattr(config, k):
                        setattr(config, k, v)
                return CommandResult(
                    command_id=command.command_id,
                    node_id=config.NODE_ID,
                    success=True,
                    output="Config updated",
                    error=None
                )
            else:
                return CommandResult(
                    command_id=command.command_id,
                    node_id=config.NODE_ID,
                    success=False,
                    output=None,
                    error=f"Unknown command: {command.command_type}"
                )
        except Exception as e:
            return CommandResult(
                command_id=command.command_id,
                node_id=config.NODE_ID,
                success=False,
                output=None,
                error=str(e)
            )

    async def execute_commands(self, commands: list[NodeCommand], service_registry):
        for cmd in commands:
            logger.info(f"Executing command: {cmd.command_type}")
            result = self.process_command(cmd, service_registry)
            # Typically you'd send this result back to control plane
            # If the architecture dictates pushing results, do it here

    async def _restart_delayed(self):
        await asyncio.sleep(1)
        os.execv(sys.executable, ['python'] + sys.argv)

    def _get_tail_logs(self) -> str:
        # Simplistic log tailing (in production, read from an actual log file)
        return "Tail of logs not implemented for this mock."
