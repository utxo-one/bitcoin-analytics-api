import { NestFactory } from '@nestjs/core';
import { LndServiceModule } from './lnd-service.module';

async function bootstrap() {
  const app = await NestFactory.create(LndServiceModule);
  await app.listen(3000);
}
bootstrap();
