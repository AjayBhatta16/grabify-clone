CREATE TABLE Links (
    trackingID TEXT PRIMARY KEY,
    redirectID TEXT UNIQUE,
    targetURL TEXT,
    ownerID TEXT,
    notes TEXT 
)