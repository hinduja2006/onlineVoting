
// server.js
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./db');

const cors = require('cors');



const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));


app.use(cors({
  origin: 'http://localhost:5500', // or the actual origin where your frontend runs
  credentials: true // ✅ Allow credentials (cookies)
}));

// Add this near the top of server.js
const path = require('path');

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve login page explicitly (optional)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// REGISTER
app.post('/register', async (req, res) => {
    const { name: username, email, password } = req.body;

  
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
  
    const hashedPassword = await bcrypt.hash(password, 10);
  
    const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
    db.query(query, [username, email, hashedPassword], (err, results) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'Email already in use' });
        }
        return res.status(500).json({ message: 'Database error', error: err });
      }
  
      res.status(201).json({ message: 'User registered successfully' });
      

    });
  });
  

// LOGIN
// LOGIN
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Please provide both username and password' });
  }

  const query = 'SELECT * FROM users WHERE username = ?';
  db.query(query, [username], async (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = results[0];
    const isValid = await bcrypt.compare(password, user.password);

    if (isValid) {
      req.session.userId = user.id;
      res.status(200).json({ message: 'Login successful' });  // ✅ success response
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  });
});


 
// POST request to update voter details
app.post('/voter', (req, res) => {
    const { voterId, aadhar } = req.body;
    
    //console.log('Request Body:', req.body); // Debugging request data
  
    // Ensure the user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'You must be logged in to update information.' });
    }
  
    const userId = req.session.userId;
  
    const query = `
      UPDATE users
      SET voter_id = ?, aadhar = ?
      WHERE id = ?
    `;
  
    //console.log('Executing SQL Query:', query, [voterId, aadhar, userId]); // Debugging query and parameters
  
    db.query(query, [voterId, aadhar, userId], (err, results) => {
      if (err) {
        console.error('Error updating voter information:', err); // Debugging error
        return res.status(500).json({ success: false, message: 'Error updating voter information', error: err.message ||err });
      }
  
      //console.log('Update successful:', results); // Debugging result of the query
      res.json({ success: true, message: 'Voter information updated successfully!' });
    });
  });
  
// Route to submit vote
app.post('/submit-vote', (req, res) => {
  const { district, constituency, mlaName, party } = req.body;

  // Ensure user is logged in
  if (!req.session.userId) {
    return res.status(401).json({ message: 'You must be logged in to vote.' });
  }

  const userId = req.session.userId;

  // Step 1: Check if user has already voted
  db.query('SELECT has_voted FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      console.error('Error checking vote status:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (!results.length || results[0].has_voted) {
      return res.status(403).json({ message: 'You have already voted' });
    }

    // Step 2: Update vote count
    const voteQuery = `
      UPDATE candidates
      SET votes = votes + 1
      WHERE name = ? AND party = ? AND district = ? AND constituency = ?
    `;

    db.query(voteQuery, [mlaName, party, district, constituency], (err, result) => {
      if (err) {
        console.error('Error submitting vote:', err);
        return res.status(500).json({ message: 'Error submitting vote' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Candidate not found' });
      }

      // Step 3: Mark user as voted
      db.query('UPDATE users SET has_voted = TRUE WHERE id = ?', [userId], (err) => {
        if (err) {
          console.error('Error updating vote status:', err);
          return res.status(500).json({ message: 'Vote submitted, but failed to update user status' });
        }

        res.status(200).json({ message: 'Vote submitted successfully' });
      });
    });
  });
});


app.get('/has-voted', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ hasVoted: false });
  }

  db.query('SELECT has_voted FROM users WHERE id = ?', [req.session.userId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(500).json({ hasVoted: false });
    }

    res.json({ hasVoted: results[0].has_voted });
  });
});





// Route to get results for a district and constituency
// Route to get results for a district and constituency
app.get('/get-results', (req, res) => {
  const { district, constituency } = req.query;

  // Fetch results by district and constituency
  const query = `
    SELECT name, party, votes
    FROM candidates
    WHERE district = ? AND constituency = ?
    ORDER BY votes DESC
  `;

  db.query(query, [district, constituency], (err, results) => {
    if (err) {
      console.error('Error fetching results:', err);
      return res.status(500).send('Error fetching results');
    }

    if (results.length === 0) {
      return res.status(404).send('No results found');
    }

    res.status(200).json(results);
  });
});


// Route to get winning candidates for all constituencies
app.get('/election-winners', (req, res) => {
  const query = `
    SELECT c1.constituency, c1.district, c1.name, c1.party, c1.votes
    FROM candidates c1
    INNER JOIN (
        SELECT district, constituency, MAX(votes) AS max_votes
        FROM candidates
        GROUP BY district, constituency
    ) c2 ON c1.district = c2.district AND c1.constituency = c2.constituency AND c1.votes = c2.max_votes
    ORDER BY c1.district, c1.constituency
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching winners:', err);
      return res.status(500).json({ message: 'Error fetching winners' });
    }

    res.status(200).json(results);
  });
});

  

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});





