import { Strategy as LocalStrategy, IStrategyOptions } from 'passport-local';
import { compareSync } from 'bcryptjs';

import { User } from '../../app/Models/User';
import { Admins } from '../../app/Models/Admins';

const options: IStrategyOptions = {
  // usernameField: 'phoneNumber',
  usernameField: 'email',
  passwordField: 'password',
  session: false,
}
export default new LocalStrategy(options, async (email, password, done)  => {
  try{
    const user = await User.findOne({email,isDeleted:false});
    if (!user) {
      const admin = await Admins.findOne({email,isDeleted:false})
      if(admin){
        if (!compareSync(password, admin.password)) {
          return done(null, false, {message: 'Incorrect Password'});
        }
        return done(null, admin, {message: 'User found'});

      }
      return done(null, false, {message: "User Doesn't Exist"});
    }

    if (!compareSync(password, user.password)) {
      return done(null, false, {message: 'Incorrect Password'});
    }

    // user.lastLogin = new Date(Date.now());
    // await user.save();

    return done(null, user, {message: 'User found'});
  }catch (e) {
    return done(null, false, {message: e});
  }
});

