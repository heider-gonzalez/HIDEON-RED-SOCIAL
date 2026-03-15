declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }
}

declare namespace Deno {
  var serve: (
    handler: (req: Request) => Response | Promise<Response>
  ) => void;
}
