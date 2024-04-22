import { NestFactory } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ChainImportModule } from './chain-import.module';

async function bootstrap() {
  const app = await NestFactory.create(ChainImportModule);
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  await app.listen(3006);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
