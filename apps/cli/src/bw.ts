import "core-js/proposals/explicit-resource-management";

import { program } from "commander";
import { firstValueFrom } from "rxjs";

import { OssServeConfigurator } from "./oss-serve-configurator";
import { registerOssPrograms } from "./register-oss-programs";
import { ServeProgram } from "./serve.program";
import { ServiceContainer } from "./service-container/service-container";
import { validateVaultServerUrls } from "./platform/commands/server-config-validation";

async function main() {
  const serviceContainer = new ServiceContainer();
  let disposed = false;
  const dispose = () => {
    if (disposed) {
      return;
    }

    disposed = true;
    serviceContainer.dispose();
  };

  // Some existing command guards call process.exit(), which does not unwind
  // through finally. Ensure Desktop IPC is also closed on those paths.
  process.once("exit", dispose);

  try {
    await serviceContainer.init();

    // Temporary development gate. Commands that can access a remote service
    // must not silently inherit the original application's production cloud.
    const args = process.argv.slice(2);
    const safeCommands = new Set([
      "config", "status", "lock", "update", "encode", "generate",
      "completion", "sdk-version",
    ]);
    const showingHelp = args.some((arg) =>
      ["--help", "-h", "--version", "-v"].includes(arg),
    );
    // Receiving external Send links or running the embedded HTTP server
    // can bypass the command-level environment guard through SDK routes.
    // Keep these entry points disabled until their transport boundaries are audited.
    if (!showingHelp && args.some((arg) => arg === "receive" || arg === "serve")) {
      process.stderr.write(
        "GoreeCloud Vault CLI receive and serve are disabled until network isolation is verified.\n",
      );
      process.exitCode = 1;
      return;
    }

    if (args.length > 0 && !showingHelp && !safeCommands.has(args[0])) {
      const environment = await firstValueFrom(serviceContainer.environmentService.environment$);
      const problem = environment.isCloud()
        ? "Inherited Bitwarden cloud regions are disabled. Configure a GoreeCloud Vault development server."
        : validateVaultServerUrls(environment.getUrls());
      if (problem) {
        process.stderr.write(problem + "\n");
        process.exitCode = 1;
        return;
      }
    }

    await registerOssPrograms(serviceContainer);

    // ServeProgram is registered separately so it can be overridden by bit-cli
    const serveConfigurator = new OssServeConfigurator(serviceContainer);
    new ServeProgram(serviceContainer, serveConfigurator).register();

    await program.parseAsync(process.argv);
  } finally {
    process.removeListener("exit", dispose);
    dispose();
  }
}

// Node does not support top-level await statements until ES2022, esnext, etc which we don't use yet
// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
