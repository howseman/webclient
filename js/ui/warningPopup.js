/**
 * Various warning triangle popups from the top header. This covers 
 * cases for over quota, ephemeral session, non activated accounts 
 * after purchase and PRO plan expired warnings.
 */
var warnPopup = {
        
    /** Whether the popup has been seen or not so it won't keep auto showing on new pages */
    seen: false,
    
    /** All the user's last payment information from the API */
    lastPaymentInfo: null,
    
    /**
     * Shows a dialog with a message that the user is over quota
     */
    showOverQuota: function() {
        
        // Cache lookups
        var $container = $('.warning-popup-icon.over-quota');
        var $dialog = $container.find('.top-warning-popup');
                    
        // Redirect to Pro signup page on button click
        $container.find('.warning-button').click(function() {
            document.location.hash = 'pro';
        });
        
        // Hide other dialogs that may be open and make the icon clickable
        warnPopup.hideOtherWarningDialogs();
        warnPopup.addWarningIconClickHandler($container, $dialog);
        warnPopup.showWarningPopup($container, $dialog);  
    },
    
    /**
     * Shows when a user has uploaded a file to an ephemeral session
     */
    showEphemeral: function() {
        
        // Cache lookups
        var $container = $('.warning-popup-icon.ephemeral-session');
        var $dialog = $container.find('.top-warning-popup');
                
        // Redirect to register signup page on button click
        $container.find('.warning-button').click(function() {
            
            // If already registered, but email not confirmed, do nothing
            if (isNonActivatedAccount()) {
                return false;
            }
            
            // Hide the dialog and go to register page
            $dialog.removeClass('active');
            document.location.hash = 'register';      
        });
        
        // Hide other dialogs that may be open and make the icon clickable
        warnPopup.hideOtherWarningDialogs();
        warnPopup.addWarningIconClickHandler($container, $dialog);
        warnPopup.showWarningPopup($container, $dialog);  
    },
    
    /**
     * Shows after registering, then purchasing a plan, but they haven't confirmed their email yet
     * @param {Boolean} log Whether to log this event or not
     */
    showNonActivatedAccount: function(log) {
        
        // Cache lookups
        var $container = $('.warning-popup-icon.non-activated-account');
        var $dialog = $container.find('.top-warning-popup');
                
        // Log event
        if (log) {
            megaAnalytics.log('pro', 'showNonActivatedAccountDialog');
        }
        
        // Hide other dialogs that may be open
        warnPopup.hideOtherWarningDialogs();
        warnPopup.showWarningPopup($container, $dialog);     
    },
       
    /**
     * A helpful PRO plan renewal popup which is shown when their PRO plan has expired
     */
    showProPlanExpired: function() {
        
        // If their last payment info is not set by the API, then their plan is not currently expired.
        // Also if they've already seen the popup, then don't keep showing it again or it's annoying.
        if (warnPopup.lastPaymentInfo === null) {
            return false;
        }
        
        // Don't display the popup for Apple or Google as they are recurring subscriptions. If the lastPaymentInfo is 
        // set then it means they have purposefully cancelled their account and would not want to see any warnings.
        if ((warnPopup.lastPaymentInfo.gwname === 'iTunes') || (warnPopup.lastPaymentInfo.gwname === 'Google')) {
            return false;
        }
        
        // Cache lookups
        var $container = $('.warning-popup-icon.astropay-payment-reminder');
        var $dialog = $container.find('.top-warning-popup');
                        
        // Get PRO plan name e.g. PRO III
        var proNum = warnPopup.lastPaymentInfo.p;
        var proPlanName = getProPlan(proNum);
        
        // Convert the timestamps to yyyy-mm-dd format
        var purchasedDate = warnPopup.formatTimestampToDate(warnPopup.lastPaymentInfo.ts);
        var expiryDate = warnPopup.formatTimestampToDate(warnPopup.lastPaymentInfo.exts);
        
        // Work out the number of months their previous plan was for e.g. 1 month or 3 months
        var planMonths = warnPopup.lastPaymentInfo.m;
        var planMonthsPluralisation = (planMonths > 1) ? l[6788] : l[913];
        
        // Set the payment provider name and icon
        var gatewayName = warnPopup.lastPaymentInfo.gwname;
        var gatewayData = (typeof warnPopup.lastPaymentInfo.gwd !== 'undefined') ? warnPopup.lastPaymentInfo.gwd : null;
            gatewayName = (gatewayData) ? gatewayData.gwname : gatewayName;
        var gatewayDisplayName = warnPopup.normaliseGatewayName(gatewayName, gatewayData);
                
        // Display
        $dialog.find('.header-pro-plan').text(proPlanName);
        $dialog.find('.purchased-date').text(purchasedDate);
        $dialog.find('.expired-date').text(expiryDate);
        $dialog.find('.pro-plan').text(proPlanName);
        $dialog.find('.plan-duration').text(planMonths + ' ' + planMonthsPluralisation);
        $dialog.find('.provider-icon').addClass(gatewayName);
        $dialog.find('.gateway-name').text(gatewayDisplayName);
        
        // On the Choose button click
        $dialog.find('.warning-button.choose').rebind('click', function() {
            
            // Hide the dialog and go to pro page
            $dialog.removeClass('active');
                        
            // Set a flag so it doesn't show each time
            warnPopup.seen = true;
            
            // Go to the first step of the Pro page so they can choose a new plan
            document.location.hash = 'pro';
        });
        
        // On the Renew button click
        $dialog.find('.warning-button.renew').rebind('click', function() {
            
            // Hide the dialog
            $dialog.removeClass('active');
            
            // Set a flag so it doesn't show each time
            warnPopup.seen = true;
            
            // Get the link for the Pro page second step e.g. #pro_lite, #pro_1 etc
            var proLink = (proNum === 4) ? 'lite' : proNum;
            
            // Go to the second step of the Pro page which will pre-populate the details
            document.location.hash = 'pro_' + proLink;
        });
                        
        // Hide other dialogs that may be open and make the icon clickable
        warnPopup.hideOtherWarningDialogs();
        warnPopup.addWarningIconClickHandler($container, $dialog);
        warnPopup.showWarningPopup($container, $dialog);        
    },
    
    /**
     * Return a translated string for the Gateway Name / Payment Provider Name. If an AstroPay 
     * gateway it will return the relevant sub gateway e.g. Visa, MasterCard, Bradesco etc.
     * @param {String} gatewayName The name on the API
     * @param {Object} gatewayData Any additional data from the API about the gateway
     * @returns {String} Returns the name of the gateway for display
     */
    normaliseGatewayName: function(gatewayName, gatewayData) {
        
        // If AstroPay then the API has an exact name for that gatway
        if (gatewayData) {
            return gatewayData.label;           // Visa, Mastercard etc
        }
        else if (gatewayName === 'Infobip') {
            return l[7219] + ' (Centilli)';     // Mobile (Centilli)
        }
        else if (gatewayName === 'T-Pay') {
            return l[7219] + ' (T-Pay)';        // Mobile (T-Pay)
        }
        else if (gatewayName === 'Fortumo') {
            return l[7219] + ' (Fortumo)';      // Mobile (Fortumo)
        }
        else if (gatewayName === 'voucher') {
            return l[487] + ' / ' + l[7108];    // Voucher code / Balance
        }
        else if (gatewayName === 'wiretransfer') {
            return l[6198];                     // Wire transfer
        }
        else {
            // As a default, return name of the gateway from the API
            return gatewayName;
        }
    },
    
    /**
     * Converts a timestamp to a localised yyyy-mm-dd format e.g. 2016-04-17
     * @param {Number} timestamp The UNIX timestamp
     * @returns {String} Returns the date in yyyy-mm-dd format
     */
    formatTimestampToDate: function(timestamp) {
        
        var date = new Date(timestamp * 1000);
        var year = date.getFullYear();
        var month = (date.getMonth() + 1);
            month = (month < 10) ? '0' + month : month;
        var day = (date.getDate() < 10) ? '0' + date.getDate() : date.getDate();
        
        return year + '-' + month + '-' + day;
    },
        
    /**
     * Adds a click event on the warning icon to hide and show the dialog
     * @param {Object} $container The dialog's container
     * @param {Object} $dialog The dialog
     */
    addWarningIconClickHandler: function($container, $dialog) {
        
        // On warning icon click
        $container.find('.warning-icon-area').rebind('click', function() {
            
            // If the popup is currently visible
            if ($dialog.hasClass('active')) {
                
                // Hide the popup
                $dialog.removeClass('active');
                
                // Set flag so it doesn't auto show each time
                warnPopup.seen = true;
            }
            else {
                // Otherwise show the popup
                $dialog.addClass('active');
            }
        });        
    },
    
    /**
     * Shows the warning popup
     * @param {Object} $container The dialog's container
     * @param {Object} $dialog The dialog
     */
    showWarningPopup: function($container, $dialog) {
        
        // If they have seen it already
        if (warnPopup.seen) {
            
            // Just show the warning icon and they can click to re-show it if they want
            $container.removeClass('hidden');
            $dialog.removeClass('active');
        }
        else {
            // Otherwise auto show the dialog and warning icon
            $container.removeClass('hidden');
            $dialog.addClass('active');
        }
    },
    
    /**
     * Hides other warning dialogs if they are currently visible so there is no double up
     */
    hideOtherWarningDialogs: function() {
        
        var $containers = $('.warning-popup-icon');
        var $dialogs = $containers.find('.top-warning-popup');
        
        $containers.addClass('hidden');
        $dialogs.removeClass('active');
    }
};