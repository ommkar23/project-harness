import { BraintrustSpanProcessor } from '@braintrust/otel';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';

const provider = new NodeTracerProvider({
  spanProcessors: [new BraintrustSpanProcessor()],
});

provider.register();
