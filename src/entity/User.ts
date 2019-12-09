import { Entity, Column, PrimaryGeneratedColumn, BeforeInsert, BeforeUpdate, AfterLoad } from "typeorm";
import bcrypt from "bcrypt-nodejs";
import crypto from "crypto";


type comparePasswordFunction = (candidatePassword: string, cb: (err: any, isMatch: any) => {}) => void;

export interface AuthToken {
  accessToken: string;
  kind: string;
}

@Entity()
export class User {

  @PrimaryGeneratedColumn("uuid")
  id: number;

  @Column()
  email: string;

  @Column()
  password: string;

  private tempPassword: string;

  @AfterLoad()
  private loadTempPassword(): void {
    this.tempPassword = this.password;
  }

  @Column()
  passwordResetToken: string;

  @Column()
  passwordResetExpires: string;

  @Column()
  facebook: string;

  @Column()
  twitter: string;

  @Column()
  google: string;

  @Column("simple-array")
  tokens: Array<AuthToken>;

  @Column("simple-json")
  profile: { 
    name: string; 
    gender: string;
    location: string; 
    website: string;
    picture: string;
  };

  @BeforeInsert()
  @BeforeUpdate()
  async genSalt() {
    if (this.tempPassword == this.password) {return;}
    bcrypt.genSalt(10, (err, salt) => {
      if (err) {return err;}
      bcrypt.hash(this.password, salt, undefined, (err: Error, hash) => {
        if (err) {return err;}
        this.password = hash;
      });
    });
  }

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
