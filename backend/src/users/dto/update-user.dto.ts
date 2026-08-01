import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../user.entity';

export class UpdateUserDto {
  @IsOptional()
  @IsEnum(UserRole, {
    message: 'Le rôle doit valoir USER, TECHNICIAN ou ADMIN.',
  })
  role?: UserRole;

  @IsOptional()
  @IsBoolean({ message: "L'activation doit être un booléen." })
  isActive?: boolean;
}
