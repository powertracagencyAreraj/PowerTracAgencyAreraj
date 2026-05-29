// ==========================================
// 1. SUPABASE SETUP (DIRECT CONNECTION)
// ==========================================
// Copy these exactly from your Supabase Dashboard -> Settings -> API
    const supabaseUrl = 'https://ehsxqjyzunbfjklxzpok.supabase.co'; // Replace with your real URL later
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoc3hxanl6dW5iZmprbHh6cG9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NjI3ODksImV4cCI6MjA5NTUzODc4OX0.sj2xbKTllV5B_qU-ZRhq7A6DrDo2eU84eIJ89HaC9Qs'; // Replace with your real Key later
    
    const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. LANGUAGE SWITCHER LOGIC (UPGRADED)
// ==========================================
localStorage.removeItem('agencyLang'); 
let currentLang = localStorage.getItem('agencyLang') || 'hi';

document.addEventListener("DOMContentLoaded", () => {
    // Check if they have visited before
    const hasVisited = localStorage.getItem('agencyLang');
    
    if (!hasVisited) {
        // If it's their first time, show the welcome gate!
        document.getElementById('welcome-modal').style.display = 'flex';
    } else {
        // If they've been here before, just load normally
        applyLanguage(currentLang);
    }
    
    // Run the tractor fetches if the functions exist on the page
    if (typeof fetchTractors === "function") fetchTractors();
    if (typeof fetchFeaturedTractors === "function") fetchFeaturedTractors();
});

function toggleLanguage() {
    currentLang = currentLang === 'hi' ? 'en' : 'hi';
    localStorage.setItem('agencyLang', currentLang); 
    applyLanguage(currentLang);
}

function applyLanguage(lang) {
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
        langBtn.innerText = translations[lang].langButton;
    }
    
    // 1. Update standard text on the screen
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.innerText = translations[lang][key];
        }
    });

    // 2. NEW: Update placeholders inside typing boxes
    const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[lang] && translations[lang][key]) {
            el.placeholder = translations[lang][key];
        }
    });
    
    document.documentElement.lang = lang;
}

// ==========================================
// 3. INVENTORY FETCH LOGIC
// ==========================================
async function fetchTractors() {
    const tractorGrid = document.getElementById('tractor-grid');
    if (!tractorGrid) return; 

    // Stop if database isn't hooked up yet
    if (!supabase) {
        tractorGrid.innerHTML = '<p>Database not connected yet. Please add your Supabase keys.</p>';
        return;
    }

    try {
        const { data, error } = await supabaseClient.from('tractors').select('*');
        if (error) throw error;

        tractorGrid.innerHTML = '';
        
        if (data.length === 0) {
             tractorGrid.innerHTML = '<p>No tractors found in the database.</p>';
             return;
        }

        data.forEach(tractor => {
            const card = document.createElement('div');
            card.className = 'tractor-card';
            
            // If there is no image URL, use a default fallback image
            const imageUrl = tractor.image_url ? tractor.image_url : 'https://via.placeholder.com/400x200?text=No+Image+Available';

            // Replaced the placeholder div with an actual img tag
            card.innerHTML = `
                <img src="${imageUrl}" alt="${tractor.name} ${tractor.model}" class="tractor-photo">
                <div class="card-content">
                    <h3>${tractor.name} - ${tractor.model}</h3>
                    <p><strong>HP:</strong> ${tractor.hp}</p>
                    <p><strong>Price:</strong> ₹${tractor.price.toLocaleString('en-IN')}</p>
                    <button class="btn-primary inquiry-btn" onclick="openInquiry('${tractor.name}', '${tractor.model}')" data-i18n="btnInquiry">
                        ${translations[currentLang].btnInquiry}
                    </button>
                </div>
            `;
            tractorGrid.appendChild(card);
        });

    } catch (error) {
        console.error('Error fetching tractors:', error);
        tractorGrid.innerHTML = '<p>Error loading inventory. Please try again.</p>';
    }
}

// ==========================================
// 4. INQUIRY BUTTON LOGIC
// ==========================================
// ==========================================
// 4. INQUIRY POP-UP & FORM LOGIC
// ==========================================

// Open the pop-up and fill in the tractor details
function openInquiry(tractorName, tractorModel) {
    const modal = document.getElementById('inquiry-modal');
    const detailsText = document.getElementById('modal-tractor-details');
    const hiddenInput = document.getElementById('tractor-interest');
    
    // Set the text so the user knows what they are inquiring about
    const fullTractorName = `${tractorName} - ${tractorModel}`;
    detailsText.innerText = fullTractorName;
    hiddenInput.value = fullTractorName; // Save secretly for the database submission
    
    // Show the modal container using flexbox alignment
    modal.style.display = 'flex';
}

// Close the pop-up when the "X" button or backdrop is clicked
function closeInquiry() {
    document.getElementById('inquiry-modal').style.display = 'none';
}

// Handle the form submission process safely
async function submitInquiry(event) {
    event.preventDefault(); // Prevents the browser from refreshing the entire page
    
    // Gather the text inputs entered by the user
    const name = document.getElementById('user-name').value;
    const phone = document.getElementById('user-phone').value;
    const address = document.getElementById('user-address').value;
    const tractor = document.getElementById('tractor-interest').value;

    try {
        // Insert the dataset into your specific Supabase table
        const { error } = await supabaseClient
            .from('leads')
            .insert([{ 
                name: name, 
                phone: phone, 
                address: address, 
                tractor_interest: tractor 
            }]);

        if (error) throw error;

        // Display a localized notification pull from your translations dictionary
        alert(translations[currentLang].successMsg);
        
        // Clean up: close window and wipe form values for next customer
        closeInquiry();
        document.getElementById('inquiry-form').reset();

    } catch (error) {
        console.error('Error saving lead directly to Supabase table:', error);
        
        // Display a localized error alert if something interrupts the process
        alert(translations[currentLang].errorMsg);
    }
}

// ==========================================
// 5. HOMEPAGE FEATURED TRACTORS
// ==========================================
async function fetchFeaturedTractors() {
    const featuredGrid = document.getElementById('featured-tractors-grid');
    if (!featuredGrid) return; // If we aren't on the homepage, stop running.

    if (!supabaseClient) return;

    try {
        // .limit(2) tells Supabase to ONLY send back 2 tractors!
        const { data, error } = await supabaseClient.from('tractors').select('*').limit(2);
        
        if (error) throw error;

        featuredGrid.innerHTML = '';
        
        if (!data || data.length === 0) {
             featuredGrid.innerHTML = '<p>No featured tractors available right now.</p>';
             return;
        }

        data.forEach(tractor => {
            const card = document.createElement('div');
            card.className = 'tractor-card';
            
            const imageUrl = tractor.image_url ? tractor.image_url : 'https://via.placeholder.com/400x200?text=No+Image+Available';

            card.innerHTML = `
                <img src="${imageUrl}" alt="${tractor.name} ${tractor.model}" class="tractor-photo">
                <div class="card-content">
                    <h3>${tractor.name} - ${tractor.model}</h3>
                    <p><strong>HP:</strong> ${tractor.hp}</p>
                    <p><strong>Price:</strong> ₹${tractor.price.toLocaleString('en-IN')}</p>
                    <button class="btn-primary inquiry-btn" onclick="window.location.href='inventory.html'" data-i18n="btnViewInventory">
                        ${translations[currentLang].btnViewInventory}
                    </button>
                </div>
            `;
            featuredGrid.appendChild(card);
        });

    } catch (error) {
        console.error('Error fetching featured tractors:', error);
        featuredGrid.innerHTML = '<p>Could not load tractors.</p>';
    }
}

// ==========================================
// 6. VOICE GREETING & WELCOME GATE (HYBRID)
// ==========================================
function enterSite(selectedLang) {
    // 1. Hide the welcome modal
    document.getElementById('welcome-modal').style.display = 'none';
    
    // 2. Set the website language
    currentLang = selectedLang;
    localStorage.setItem('agencyLang', currentLang);
    applyLanguage(currentLang);
    
    // 3. Play the right audio based on their choice
    if (selectedLang === 'hi') {
        // Play the premium ElevenLabs MP3 for Hindi
        try {
            let greetingAudio = new Audio('audio/greeting-hi.mp3');
            greetingAudio.play();
        } catch (error) {
            console.error("Could not play the custom Hindi audio:", error);
        }
    } else {
        // Use the built-in polite computer voice for English
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance("Welcome to Powertrac Agency. We are at your service.");
        
        utterance.lang = 'en-US';
        utterance.rate = 0.85;  // Slower speed
        utterance.pitch = 1.15; // Softer pitch
        
        const voices = synth.getVoices();
        const premiumVoice = voices.find(voice => voice.lang === utterance.lang && voice.name.includes('Google')) 
                          || voices.find(voice => voice.lang === utterance.lang);
                          
        if (premiumVoice) {
            utterance.voice = premiumVoice;
        }

        synth.speak(utterance);
    }
}
