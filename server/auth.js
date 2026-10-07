import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { userDb } from './database.js';

// Configure Local Strategy (email + password)
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        let cleanEmail = (email || '').toLowerCase().trim();

        // Reject @gmail.com / @googlemail.com
        if (cleanEmail.endsWith('@gmail.com') || cleanEmail.endsWith('@googlemail.com')) {
          return done(null, false, { 
            message: 'Tidak dapat menggunakan Google Mail (@gmail.com). Silakan gunakan akun @deepernova.com.', 
            code: 'GMAIL_NOT_ALLOWED' 
          });
        }

        // Auto-append @deepernova.com if username provided without domain
        if (!cleanEmail.includes('@')) {
          cleanEmail = `${cleanEmail}@deepernova.com`;
        } else if (cleanEmail.endsWith('@deepmail.com')) {
          cleanEmail = cleanEmail.replace(/@deepmail\.com$/, '@deepernova.com');
        }

        const user = userDb.findByEmail(cleanEmail);

        if (!user) {
          // Distinguish between "user not found" and "wrong password"
          return done(null, false, { message: `Username/Email "${cleanEmail}" belum terdaftar.`, code: 'USER_NOT_FOUND' });
        }

        if (!user.password) {
          return done(null, false, { message: 'Akun ini tidak memiliki password. Silakan hubungi support.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          // Distinguish between "user not found" and "wrong password"
          return done(null, false, { message: 'Password salah', code: 'WRONG_PASSWORD' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser((id, done) => {
  try {
    console.log(`[Passport] Deserializing user ID: ${id}`);
    const user = userDb.findById(id);
    console.log(`[Passport] Found user:`, user ? `${user.email}` : 'null');
    done(null, user);
  } catch (error) {
    console.error(`[Passport] Deserialization error for ID ${id}:`, error);
    done(error);
  }
});

// Hash password helper
export const hashPassword = async (password) => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

export default passport;
