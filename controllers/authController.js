export const loginPage = (req, res) => {
    res.render('user/login', { user: null });
};

export const homePage = (req, res) => {
    res.render('user/home', { user: req.user });
};

export const logout = (req, res) => {
    req.logout(err => {
        if (err) return next(err);
        res.redirect('/login');
    });
};
