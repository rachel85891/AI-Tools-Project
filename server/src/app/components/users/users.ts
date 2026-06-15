import { Component } from '@angular/core';
import { Login } from './login/login';
import { Signup } from "./signup/signup";
import { InplaceModule } from 'primeng/inplace';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-users',
  imports: [Login, Signup, InplaceModule, ButtonModule],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users {
signupVisible:boolean = false;
}
