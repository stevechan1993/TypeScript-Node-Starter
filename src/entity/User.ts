import bcrypt from "bcrypt-nodejs";
import crypto from "crypto";
import { Entity, CreateDateColumn, UpdateDateColumn, BaseEntity, Column, PrimaryGeneratedColumn, BeforeInsert, BeforeUpdate, AfterInsert, AfterUpdate } from "typeorm";

export interface UserDocument {
  id: number;
  email: string;
  password: string;
  passwordResetToken: string;
  passwordResetExpires: Date;

  facebook: string;
  tokens: AuthToken[];

  profile: Profile;

  comparePassword: comparePasswordFunction;
  gravatar: (size: number) => string;
}

type comparePasswordFunction = (candidatePassword: string, cb: (err: any, isMatch: any) => {}) => void;

export class Profile {
  @Column()
  name: string;

  @Column()
  gender: string;

  @Column()
  location: string;

  @Column()
  website: string;

  @Column()
  picture: string;
}

export interface AuthToken {
  accessToken: string;
  kind: string;
}

// const userSchema = new EntitySchema({
//   name: "user",
//   columns: {
//     email: { 
//       type: String, 
//       unique: true 
//     },
//     password: {
//       type: String
//     },
//     passwordResetToken: {
//       type: String
//     },
//     passwordResetExpires: {
//       type: Date
//     },
//     facebook: {
//       type: String
//     },
//     twitter: {
//       type: String
//     },
//     google: {
//       type: String
//     },
//     tokens: {
//       type: String
//     },
//     profile: {
//       type: Profile,
//     }
//   },
//   uniques: [
//     {
//       name: "UNIQUE_TEST",
//       columns: [
//         "email"
//       ]
//     }
//   ]
// });

@Entity()
export class User extends BaseEntity{

  @PrimaryGeneratedColumn("uuid")
  id: number;

  @Column({
    nullable: true
  })
  email: string;

  @Column({
    nullable: true
  })
  public password: string;

  private tempPassword: string;

  // constructor(email: string, password: string) {
  //   super();
  //   this.email = email;
  //   this.password = password;
  // }

  @AfterInsert()
  @AfterUpdate()
  private loadTempPassword(): void {
    this.tempPassword = this.password;
  }

  @Column({
    nullable: true
  })
  passwordResetToken: string;

  @Column({
    nullable: true
  })
  passwordResetExpires: string;

  @Column({
    nullable: true
  })
  facebook: string;

  @Column({
    nullable: true
  })
  twitter: string;

  @Column({
    nullable: true
  })
  google: string;

  @Column("simple-array",{
    nullable: true
  })
  tokens: Array<AuthToken>;

  @Column("simple-json", {
    nullable: true
  })
  profile: { 
    name: string;
    gender: string;
    location: string; 
    website: string;
    picture: string;
  };

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  genSalt = function() {
    
    if (this.tempPassword === this.password) {return;}

    // sync
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(this.password, salt);
    this.password = hash;

    // async =>
    // const user = this as UserDocument;
    // bcrypt.genSalt(10, (err, salt) => {
    //   if (err) {
    //     return err;
    //   }
    //   bcrypt.hash(user.password, salt, undefined, (err: Error, hash) => {
    //     if (err) {
    //       return err;
    //     }
    //     user.password = hash;
    //   });
    // });

    // async
    // const user = this as UserDocument;
    // bcrypt.genSalt(10, function (err, salt) {
    //   if (err) {
    //     return err;
    //   }
    //   bcrypt.hash(user.password, salt, undefined, function(err, hash) {
    //     if (err) {
    //       return err;
    //     }
    //     // Store hash in your password DB. 
    //     user.password = hash;
    //   });
    // });
  };

  comparePassword: comparePasswordFunction = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, (err: Error, isMatch: boolean) => {
      cb(err, isMatch);
    });
  };

  gravatar = function(size: number = 200) {
    if (!this.email) {
      return `https://gravatar.com/avatar/?s=${size}&d=retro`;
    }
    const md5 = crypto.createHash("md5").update(this.email).digest("hex");
    return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
  }
}

// export const UserEntity = new EntitySchema<UserDocument>({
//   name: "user",
//     columns: {
//     email: { 
//       type: String, 
//       unique: true 
//     },
//     password: {
//       type: String
//     },
//     passwordResetToken: {
//       type: String
//     },
//     passwordResetExpires: {
//       type: Date
//     },
//     facebook: {
//       type: String
//     },
//     twitter: {
//       type: String
//     },
//     google: {
//       type: String
//     },
//     tokens: {
//       type: String
//     },
//     profile: {
//       type: Profile,
//     }
//   },
//   uniques: [
//     {
//       name: "UNIQUE_TEST",
//       columns: [
//         "email"
//       ]
//     }
//   ]
// });
